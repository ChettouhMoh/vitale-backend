import {
  describe,
  expect,
  it,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';
import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@/common/logger/logger.service';
import { InMemoryOutboxRepository } from '@/persistence/events/in-memory-outbox.repository';
import { EventBusService } from '../event-bus.service';
import { IEventBus, IOutboxRepository } from '../ports';
import { OnDomainEvent } from '../decorators';
import type { DomainEventPayload } from '../registry';
import { HandlerRegistryService } from './handler-registry.service';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

/** A controllable handler used to observe delivery + drive failures. */
@Injectable()
class PatientCreatedProbe {
  readonly calls: {
    payload: DomainEventPayload<'patient.created'>;
    eventId: string;
  }[] = [];
  failTimes = 0;

  @OnDomainEvent('patient.created')
  async handle(
    payload: DomainEventPayload<'patient.created'>,
    eventId: string,
  ): Promise<void> {
    this.calls.push({ payload, eventId });
    if (this.failTimes > 0) {
      this.failTimes -= 1;
      throw new Error('probe failure');
    }
  }
}

const laterThan = (ms: number) => new Date(Date.now() + ms);

describe('OutboxDispatcher (integration)', () => {
  let moduleRef: TestingModule;
  let bus: IEventBus;
  let dispatcher: OutboxDispatcherService;
  let outbox: InMemoryOutboxRepository;
  let probe: PatientCreatedProbe;
  let logger: Record<'info' | 'warn' | 'error' | 'debug', jest.Mock>;

  const configStub = {
    get: (key: string, def?: unknown): unknown => {
      const values: Record<string, unknown> = {
        EVENTS_DISPATCHER_ENABLED: false, // we drive dispatchDue() by hand
        EVENTS_BATCH_SIZE: 20,
        EVENTS_MAX_ATTEMPTS: 2, // small, so dead-letter is quick to reach
      };
      return key in values ? values[key] : def;
    },
  };

  beforeEach(async () => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        { provide: IOutboxRepository, useClass: InMemoryOutboxRepository },
        { provide: IEventBus, useClass: EventBusService },
        { provide: LoggerService, useValue: logger },
        { provide: ConfigService, useValue: configStub },
        HandlerRegistryService,
        OutboxDispatcherService,
        PatientCreatedProbe,
      ],
    }).compile();
    await moduleRef.init(); // runs onModuleInit → registry scans providers

    bus = moduleRef.get<IEventBus>(IEventBus);
    dispatcher = moduleRef.get(OutboxDispatcherService);
    outbox = moduleRef.get<InMemoryOutboxRepository>(IOutboxRepository);
    probe = moduleRef.get(PatientCreatedProbe);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('delivers the typed payload + event id, then deletes the published row', async () => {
    await bus.emit('patient.created', {
      patientId: 'p1',
      registeredByDoctorId: 'd1',
    });

    await dispatcher.dispatchDue();

    expect(probe.calls).toHaveLength(1);
    expect(probe.calls[0].payload).toEqual({
      patientId: 'p1',
      registeredByDoctorId: 'd1',
    });
    expect(probe.calls[0].eventId).toEqual(expect.any(String));

    // Published rows are deleted — nothing due, nothing dead-lettered.
    expect(await outbox.findDue(10, laterThan(1_000_000))).toHaveLength(0);
    expect(await outbox.findDeadLettered(10)).toHaveLength(0);
  });

  it('on handler failure, retains the row and schedules a future retry (no delete)', async () => {
    probe.failTimes = 1;
    await bus.emit('patient.created', {
      patientId: 'p2',
      registeredByDoctorId: null,
    });

    await dispatcher.dispatchDue();

    expect(probe.calls).toHaveLength(1);
    // Not due right now (backing off), but present and due later.
    expect(await outbox.findDue(10, new Date())).toHaveLength(0);
    const later = await outbox.findDue(10, laterThan(60_000));
    expect(later).toHaveLength(1);
    expect(later[0].attempts).toBe(1);
    expect(later[0].isDeadLettered).toBe(false);
  });

  it('is at-least-once: a flaky handler is re-invoked with the SAME event id', async () => {
    probe.failTimes = 1; // fail first delivery, succeed on retry
    await bus.emit('patient.created', {
      patientId: 'p3',
      registeredByDoctorId: null,
    });

    await dispatcher.dispatchDue(); // attempt 1 → fails
    const firstId = probe.calls[0].eventId;

    await dispatcher.dispatchDue(laterThan(60_000)); // retry → succeeds

    expect(probe.calls).toHaveLength(2);
    expect(probe.calls[1].eventId).toBe(firstId); // same id → why handlers must dedupe
    // Succeeded on retry → row deleted.
    expect(await outbox.findDue(10, laterThan(10_000_000))).toHaveLength(0);
    expect(await outbox.findDeadLettered(10)).toHaveLength(0);
  });

  it('dead-letters after exceeding max attempts and keeps the row for diagnosis', async () => {
    probe.failTimes = 99; // always fail
    await bus.emit('patient.created', {
      patientId: 'p4',
      registeredByDoctorId: null,
    });

    await dispatcher.dispatchDue(new Date()); // attempts 1
    await dispatcher.dispatchDue(laterThan(60_000)); // attempts 2
    await dispatcher.dispatchDue(laterThan(120_000)); // attempts 3 > max(2) → dead-letter

    expect(probe.calls).toHaveLength(3);
    const dead = await outbox.findDeadLettered(10);
    expect(dead).toHaveLength(1);
    expect(dead[0].attempts).toBe(3);
    expect(dead[0].isDeadLettered).toBe(true);
    // No longer retried.
    expect(await outbox.findDue(10, laterThan(10_000_000))).toHaveLength(0);
  });

  it('warns at bootstrap for catalogue events that have no handler', () => {
    const warnedEvents = logger.warn.mock.calls
      .map((call) => call[1])
      .filter(
        (ctx): ctx is { event: string } =>
          !!ctx && typeof ctx === 'object' && 'event' in ctx,
      )
      .map((ctx) => ctx.event);

    expect(warnedEvents).toContain('card.scanned');
    expect(warnedEvents).toContain('auth.password_changed');
    // patient.created HAS a handler (the probe) → not warned.
    expect(warnedEvents).not.toContain('patient.created');
  });
});
