import { v7 as uuidv7 } from 'uuid';
import { DomainError } from '@/common/errors/domain.error';
import { EventsErrorCode } from '@/common/errors/codes/events.errors';
import { EventName, RetrySchedule } from './value-objects';

const MAX_ERROR_LENGTH = 500;

export type OutboxPayload = Record<string, unknown>;

/** Persisted outbox row — storage-agnostic; ids are opaque strings. */
export interface OutboxEventRecord {
  id: string;
  name: string;
  payload: OutboxPayload;
  occurredAt: Date;
  publishedAt: Date | null;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: Date | null;
  deadLetteredAt: Date | null;
}

interface OutboxEventProps {
  name: string;
  payload: OutboxPayload;
  occurredAt: Date;
  publishedAt: Date | null;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: Date | null;
  deadLetteredAt: Date | null;
}

// ─── Aggregate root ─────────────────────────────────────────────────────────

export class OutboxEvent {
  private readonly _id: string;
  private props: OutboxEventProps;

  private constructor(props: OutboxEventProps, id: string) {
    this._id = id;
    this.props = props;
  }

  /**
   * A brand-new, unpublished event, due immediately. Validates the name format
   * and that the payload is JSON-serialisable primitives only.
   */
  static createNew(name: string, payload: OutboxPayload): OutboxEvent {
    const eventName = EventName.create(name);
    OutboxEvent.assertSerialisable(payload);
    const now = new Date();
    return new OutboxEvent(
      {
        name: eventName.value,
        payload,
        occurredAt: now,
        publishedAt: null,
        attempts: 0,
        lastError: null,
        nextAttemptAt: now, // due right away
        deadLetteredAt: null,
      },
      uuidv7(),
    );
  }

  /** Rehydrate from persistence — re-validates the name (DB has no guarantee). */
  static restoreExisting(record: OutboxEventRecord): OutboxEvent {
    return new OutboxEvent(
      {
        name: EventName.create(record.name).value,
        payload: record.payload,
        occurredAt: record.occurredAt,
        publishedAt: record.publishedAt,
        attempts: record.attempts,
        lastError: record.lastError,
        nextAttemptAt: record.nextAttemptAt,
        deadLetteredAt: record.deadLetteredAt,
      },
      record.id,
    );
  }

  toRecord(): OutboxEventRecord {
    return {
      id: this._id,
      name: this.props.name,
      payload: this.props.payload,
      occurredAt: this.props.occurredAt,
      publishedAt: this.props.publishedAt,
      attempts: this.props.attempts,
      lastError: this.props.lastError,
      nextAttemptAt: this.props.nextAttemptAt,
      deadLetteredAt: this.props.deadLetteredAt,
    };
  }

  // ─── Behaviours ─────────────────────────────────────────────────────────────

  /** Every handler succeeded. Marks published and stops any further attempts. */
  markPublished(): void {
    if (this.props.publishedAt) {
      throw new DomainError(
        EventsErrorCode.EVENT_ALREADY_PUBLISHED,
        `Event ${this._id} is already published`,
        409,
      );
    }
    this.props.publishedAt = new Date();
    this.props.nextAttemptAt = null;
  }

  /**
   * A handler failed. Increments the attempt count, stores a truncated error,
   * and schedules the next attempt from the retry policy — or dead-letters the
   * event when the attempts exceed the maximum.
   */
  recordFailure(
    error: string,
    schedule: RetrySchedule = RetrySchedule.default(),
  ): void {
    this.props.attempts += 1;
    this.props.lastError = error.slice(0, MAX_ERROR_LENGTH);

    const next = schedule.nextAttemptAfter(this.props.attempts);
    if (next === null) {
      this.props.deadLetteredAt = new Date();
      this.props.nextAttemptAt = null;
    } else {
      this.props.nextAttemptAt = next;
    }
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get name(): string {
    return this.props.name;
  }
  get payload(): OutboxPayload {
    return this.props.payload;
  }
  get occurredAt(): Date {
    return this.props.occurredAt;
  }
  get publishedAt(): Date | null {
    return this.props.publishedAt;
  }
  get attempts(): number {
    return this.props.attempts;
  }
  get lastError(): string | null {
    return this.props.lastError;
  }
  get nextAttemptAt(): Date | null {
    return this.props.nextAttemptAt;
  }
  get deadLetteredAt(): Date | null {
    return this.props.deadLetteredAt;
  }

  get isPublished(): boolean {
    return this.props.publishedAt !== null;
  }
  get isDeadLettered(): boolean {
    return this.props.deadLetteredAt !== null;
  }

  /** Due = not yet published, not dead-lettered, and its next attempt is now/past. */
  isDue(now: Date): boolean {
    return (
      this.props.publishedAt === null &&
      this.props.deadLetteredAt === null &&
      this.props.nextAttemptAt !== null &&
      this.props.nextAttemptAt.getTime() <= now.getTime()
    );
  }

  // ─── Payload validation ──────────────────────────────────────────────────────

  /**
   * The payload is persisted and may cross a process boundary, so it must be
   * pure JSON: plain objects/arrays of string/number/boolean/null. Dates, class
   * instances, functions, undefined, symbols, bigints and non-finite numbers are
   * rejected — a Date would silently serialise to a string and lose its type.
   */
  private static assertSerialisable(value: unknown, path = 'payload'): void {
    if (value === null) return;

    const type = typeof value;
    if (type === 'string' || type === 'boolean') return;
    if (type === 'number') {
      if (!Number.isFinite(value as number)) {
        OutboxEvent.reject(`${path} is a non-finite number`);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, i) =>
        OutboxEvent.assertSerialisable(item, `${path}[${i}]`),
      );
      return;
    }

    if (type === 'object') {
      const obj = value as Record<string, unknown>;
      const proto = Object.getPrototypeOf(obj) as object | null;
      // Only plain objects (Object.prototype or null-proto) are allowed —
      // this rejects Date, Map, class instances, etc.
      if (proto !== Object.prototype && proto !== null) {
        const ctorName =
          (obj as { constructor?: { name?: string } }).constructor?.name ??
          'unknown';
        OutboxEvent.reject(`${path} is a non-plain object (${ctorName})`);
      }
      for (const [key, v] of Object.entries(obj)) {
        OutboxEvent.assertSerialisable(v, `${path}.${key}`);
      }
      return;
    }

    // function, undefined, symbol, bigint
    OutboxEvent.reject(`${path} is not JSON-serialisable (${type})`);
  }

  private static reject(message: string): never {
    throw new DomainError(
      EventsErrorCode.EVENT_PAYLOAD_NOT_SERIALISABLE,
      `Event payload must be JSON primitives only: ${message}`,
    );
  }
}
