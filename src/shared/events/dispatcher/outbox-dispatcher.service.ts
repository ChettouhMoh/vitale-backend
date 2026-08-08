import { Inject, Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@/common/logger/logger.service';
import { IOutboxRepository } from '../ports';
import { OutboxEvent, RetrySchedule } from '../domain';
import { DomainEventName } from '../registry';
import { HandlerRegistryService } from './handler-registry.service';

// @Interval needs a compile-time constant, so the poll interval is read from the
// environment at module load (still honouring EVENTS_POLL_INTERVAL_MS).
const POLL_INTERVAL_MS = Number(process.env.EVENTS_POLL_INTERVAL_MS) || 1000;

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return 'Unknown error';
  }
}

/**
 * OutboxDispatcher — polls the outbox for due events and invokes their handlers
 * AFTER the emitting operation has already committed. A handler that throws
 * retries that event only; it can never roll back the original state change.
 *
 * Delivery is at-least-once: a retry re-invokes handlers that already succeeded,
 * so handlers must be idempotent (keyed on the event id).
 */
@Injectable()
export class OutboxDispatcherService {
  private isRunning = false;
  private readonly enabled: boolean;
  private readonly batchSize: number;
  private readonly retrySchedule: RetrySchedule;

  constructor(
    @Inject(IOutboxRepository)
    private readonly outbox: IOutboxRepository,
    private readonly registry: HandlerRegistryService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    // DECISION: in-process dispatch is deliberate for now. When Redis lands,
    // this service becomes a pump (poll → queue.addBulk → markDispatched) and
    // BullMQ takes over retry/backoff/dead-lettering. Do not build per-consumer
    // delivery tracking here — that is BullMQ's job.
    this.enabled = this.config.get<boolean>('EVENTS_DISPATCHER_ENABLED', true);
    this.batchSize = this.config.get<number>('EVENTS_BATCH_SIZE', 20);
    const maxAttempts = this.config.get<number>('EVENTS_MAX_ATTEMPTS', 5);
    this.retrySchedule = RetrySchedule.create(maxAttempts, 2);
  }

  /** The scheduled tick. Guarded against overlap and never throws upward. */
  @Interval(POLL_INTERVAL_MS)
  async tick(): Promise<void> {
    if (!this.enabled || this.isRunning) return;
    this.isRunning = true;
    try {
      await this.dispatchDue();
    } catch (err) {
      // A dispatcher crash must never take down the application.
      this.logger.error('Outbox dispatcher tick failed', {
        error: errorMessage(err),
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * One poll cycle. Exposed (with an injectable `now`) so tests can drive the
   * dispatcher deterministically instead of waiting on the interval.
   */
  async dispatchDue(now: Date = new Date()): Promise<void> {
    const due = await this.outbox.findDue(this.batchSize, now);
    for (const event of due) {
      await this.dispatchOne(event);
    }
  }

  private async dispatchOne(event: OutboxEvent): Promise<void> {
    const handlers = this.registry.handlersFor(event.name as DomainEventName);
    const startedAt = Date.now();

    // All handlers for one event run in parallel — one slow handler must not
    // block another.
    const results = await Promise.allSettled(
      handlers.map((h) => h.invoke(event.payload, event.id)),
    );
    const durationMs = Date.now() - startedAt;

    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    if (rejected.length === 0) {
      // Every handler succeeded. Mark published, then DELETE the row — the
      // outbox is sensitive (payloads hold one-time tokens); no audit trail here.
      event.markPublished();
      await this.outbox.delete(event.id);
      this.logger.info('Event dispatched', {
        eventId: event.id,
        name: event.name,
        attempts: event.attempts,
        handlers: handlers.length,
        durationMs,
      });
      return;
    }

    // At least one handler failed → retry the whole event later (at-least-once).
    const reason = rejected.map((r) => errorMessage(r.reason)).join('; ');
    event.recordFailure(reason, this.retrySchedule);
    await this.outbox.save(event);

    const level = event.isDeadLettered ? 'error' : 'warn';
    this.logger[level]('Event dispatch failed', {
      eventId: event.id,
      name: event.name,
      attempts: event.attempts,
      failedHandlers: rejected.length,
      totalHandlers: handlers.length,
      deadLettered: event.isDeadLettered,
      durationMs,
      // NB: never log the payload — it may contain reset links / PII.
    });
  }
}
