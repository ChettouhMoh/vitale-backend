import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { DiscoveryModule } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@/common/logger/logger.service';
import { InMemoryOutboxRepository } from '@/persistence/events/in-memory-outbox.repository';
import { EventBusService } from '@/shared/events/event-bus.service';
import { IEventBus, IOutboxRepository } from '@/shared/events/ports';
import {
  HandlerRegistryService,
  OutboxDispatcherService,
} from '@/shared/events/dispatcher';
import { InMemoryNotificationRepository } from '@/persistence/notification/in-memory-notification.repository';
import { HandlebarsTemplateRenderer } from '../templates';
import { SendNotificationService } from '../application';
import { AuthNotificationHandlers, DoctorNotificationHandlers } from './index';
import { NotificationTypeValue } from '../domain';
import {
  IEmailChannel,
  INotificationRepository,
  IPushChannel,
  ISmsChannel,
  ITemplateRenderer,
} from '../ports';

/** Fake email channel that records what it was asked to send. */
class FakeEmailChannel implements IEmailChannel {
  readonly sent: { to: string; subject: string }[] = [];
  async send(m: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ providerMessageId: string }> {
    this.sent.push({ to: m.to, subject: m.subject });
    return { providerMessageId: `fake-${this.sent.length}` };
  }
}

const noopChannel = {
  send: async () => ({ providerMessageId: 'noop' }),
};

const later = (ms: number) => new Date(Date.now() + ms);

// One typed emit closure per event, so payload shapes are compile-checked.
const CASES: { label: string; to: string; emit: (bus: IEventBus) => Promise<void> }[] =
  [
    {
      label: 'auth.email_verification_requested',
      to: 'verify@example.com',
      emit: (b) =>
        b.emit('auth.email_verification_requested', {
          credentialId: 'c1',
          email: 'verify@example.com',
          verificationLink: 'https://vitale.dz/v',
          expiresAt: '2026-08-10',
          locale: 'fr',
        }),
    },
    {
      label: 'auth.password_reset_requested',
      to: 'reset@example.com',
      emit: (b) =>
        b.emit('auth.password_reset_requested', {
          credentialId: 'c1',
          email: 'reset@example.com',
          resetLink: 'https://vitale.dz/r',
          expiresAt: '2026-08-10',
          locale: 'ar',
        }),
    },
    {
      label: 'auth.password_changed',
      to: 'changed@example.com',
      emit: (b) =>
        b.emit('auth.password_changed', {
          credentialId: 'c1',
          email: 'changed@example.com',
          locale: 'en',
        }),
    },
    {
      label: 'auth.pending_account_claimed',
      to: 'claimed@example.com',
      emit: (b) =>
        b.emit('auth.pending_account_claimed', {
          credentialId: 'c1',
          email: 'claimed@example.com',
          locale: 'fr',
        }),
    },
    {
      label: 'doctor.registered',
      to: 'doctor@example.com',
      emit: (b) =>
        b.emit('doctor.registered', {
          doctorId: 'd1',
          credentialId: 'c1',
          email: 'doctor@example.com',
          fullName: 'Sarah Ahmed',
          locale: 'fr',
        }),
    },
    {
      label: 'doctor.kyc_approved',
      to: 'approved@example.com',
      emit: (b) =>
        b.emit('doctor.kyc_approved', {
          doctorId: 'd1',
          email: 'approved@example.com',
          locale: 'ar',
        }),
    },
    {
      label: 'doctor.kyc_rejected',
      to: 'rejected@example.com',
      emit: (b) =>
        b.emit('doctor.kyc_rejected', {
          doctorId: 'd1',
          email: 'rejected@example.com',
          reason: 'ID photo unreadable',
          locale: 'en',
        }),
    },
  ];

describe('Notification handlers (integration)', () => {
  let moduleRef: TestingModule;
  let bus: IEventBus;
  let dispatcher: OutboxDispatcherService;
  let outbox: InMemoryOutboxRepository;
  let notifRepo: InMemoryNotificationRepository;
  let fakeEmail: FakeEmailChannel;

  const configStub = {
    get: (key: string, def?: unknown): unknown =>
      ({
        EVENTS_DISPATCHER_ENABLED: false,
        EVENTS_BATCH_SIZE: 20,
        EVENTS_MAX_ATTEMPTS: 5,
      })[key] ?? def,
  };
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    fakeEmail = new FakeEmailChannel();
    moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        // events infra
        { provide: IOutboxRepository, useClass: InMemoryOutboxRepository },
        { provide: IEventBus, useClass: EventBusService },
        HandlerRegistryService,
        OutboxDispatcherService,
        // notification context
        {
          provide: INotificationRepository,
          useClass: InMemoryNotificationRepository,
        },
        { provide: ITemplateRenderer, useClass: HandlebarsTemplateRenderer },
        { provide: IEmailChannel, useValue: fakeEmail },
        { provide: ISmsChannel, useValue: noopChannel },
        { provide: IPushChannel, useValue: noopChannel },
        SendNotificationService,
        AuthNotificationHandlers,
        DoctorNotificationHandlers,
        // shared
        { provide: ConfigService, useValue: configStub },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();
    await moduleRef.init(); // compiles templates + scans handlers

    bus = moduleRef.get<IEventBus>(IEventBus);
    dispatcher = moduleRef.get(OutboxDispatcherService);
    outbox = moduleRef.get<InMemoryOutboxRepository>(IOutboxRepository);
    notifRepo = moduleRef.get<InMemoryNotificationRepository>(
      INotificationRepository,
    );
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it.each(CASES)(
    'delivers $label to a sent notification',
    async ({ to, emit }) => {
      await emit(bus);
      await dispatcher.dispatchDue();

      // Reached the channel with the right recipient…
      expect(fakeEmail.sent.map((s) => s.to)).toContain(to);
      // …nothing failed…
      expect(await notifRepo.findFailed(10)).toHaveLength(0);
      // …and the outbox row was published (handler succeeded) and deleted.
      expect(await outbox.findDue(10, later(1_000_000))).toHaveLength(0);
    },
  );

  it('is idempotent on (eventId, type, channel): a redelivery does not send twice', async () => {
    const sender = moduleRef.get(SendNotificationService);
    const deliver = () =>
      sender.send({
        eventId: 'evt-dup',
        type: NotificationTypeValue.PasswordChanged,
        recipient: 'dup@example.com',
        locale: 'fr',
        data: {},
      });

    await deliver();
    await deliver(); // same event id → the guard skips the second send

    expect(fakeEmail.sent).toHaveLength(1);
  });
});
