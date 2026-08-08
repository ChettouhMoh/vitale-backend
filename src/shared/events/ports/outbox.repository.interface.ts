import { OutboxEvent } from '../domain';

/**
 * IOutboxRepository — persistence port for the transactional outbox. Kept clean
 * so an in-memory / SQL / queue-backed adapter can be swapped without touching
 * the dispatcher.
 */
export interface IOutboxRepository {
  save(event: OutboxEvent): Promise<void>;

  /** Unpublished, non-dead-lettered events whose nextAttemptAt is due, oldest first. */
  findDue(limit: number, now: Date): Promise<OutboxEvent[]>;

  /** Remove a row (called immediately after a successful publish). */
  delete(id: string): Promise<void>;

  /** Dead-lettered events retained for diagnosis. */
  findDeadLettered(limit: number): Promise<OutboxEvent[]>;

  /**
   * Purge dead-lettered rows older than `date`, returning the count removed.
   * MUST be scheduled in production — dead-lettered rows retain sensitive
   * payloads (reset links, PII) and cannot be kept indefinitely.
   */
  purgeDeadLetteredOlderThan(date: Date): Promise<number>;
}

export const IOutboxRepository = Symbol('IOutboxRepository');
