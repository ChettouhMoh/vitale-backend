import { v7 as uuidv7 } from 'uuid';
import { DomainError } from '@/common/errors/domain.error';
import { NotificationErrorCode } from '@/common/errors/codes/notification.errors';
import {
  Channel,
  DeliveryStatus,
  Locale,
  NotificationType,
  Recipient,
} from './value-objects';

const MAX_ERROR_LENGTH = 500;

/**
 * Persisted notification row. Note it holds the rendered SUBJECT and metadata,
 * never the rendered body — bodies carry live !!verification/reset!! tokens.
 */
export interface NotificationRecord {
  id: string;
  eventId: string;
  type: string;
  channel: string;
  locale: string;
  recipient: string;
  subject: string;
  status: string;
  attempts: number;
  lastError: string | null;
  providerMessageId: string | null;
  createdAt: Date;
  sentAt: Date | null;
}

interface NotificationProps {
  eventId: string;
  type: NotificationType;
  channel: Channel;
  locale: Locale;
  recipient: Recipient;
  subject: string;
  status: DeliveryStatus;
  attempts: number;
  lastError: string | null;
  providerMessageId: string | null;
  createdAt: Date;
  sentAt: Date | null;
}

// ─── Aggregate root ─────────────────────────────────────────────────────────

export class Notification {
  private readonly _id: string;
  private props: NotificationProps;

  private constructor(props: NotificationProps, id: string) {
    this._id = id;
    this.props = props;
  }

  /** A brand-new pending notification. The subject is already rendered. */
  static createNew(input: {
    eventId: string;
    type: NotificationType;
    channel: Channel;
    locale: Locale;
    recipient: Recipient;
    subject: string;
  }): Notification {
    return new Notification(
      {
        eventId: input.eventId,
        type: input.type,
        channel: input.channel,
        locale: input.locale,
        recipient: input.recipient,
        subject: input.subject,
        status: DeliveryStatus.pending(),
        attempts: 0,
        lastError: null,
        providerMessageId: null,
        createdAt: new Date(),
        sentAt: null,
      },
      uuidv7(),
    );
  }

  /** Rehydrate — re-validates the VOs (DB data has no DTO guarantee). */
  static restoreExisting(record: NotificationRecord): Notification {
    const channel = Channel.create(record.channel);
    return new Notification(
      {
        eventId: record.eventId,
        type: NotificationType.create(record.type),
        channel,
        locale: Locale.create(record.locale),
        recipient: Recipient.forChannel(record.recipient, channel),
        subject: record.subject,
        status: DeliveryStatus.create(record.status),
        attempts: record.attempts,
        lastError: record.lastError,
        providerMessageId: record.providerMessageId,
        createdAt: record.createdAt,
        sentAt: record.sentAt,
      },
      record.id,
    );
  }

  toRecord(): NotificationRecord {
    return {
      id: this._id,
      eventId: this.props.eventId,
      type: this.props.type.value,
      channel: this.props.channel.value,
      locale: this.props.locale.value,
      recipient: this.props.recipient.value,
      subject: this.props.subject,
      status: this.props.status.value,
      attempts: this.props.attempts,
      lastError: this.props.lastError,
      providerMessageId: this.props.providerMessageId,
      createdAt: this.props.createdAt,
      sentAt: this.props.sentAt,
    };
  }

  // ─── Behaviours ─────────────────────────────────────────────────────────────

  markSent(providerMessageId: string): void {
    if (this.props.status.isSent) {
      throw new DomainError(
        NotificationErrorCode.NOTIFICATION_ALREADY_SENT,
        `Notification ${this._id} is already sent`,
        409,
      );
    }
    this.props.status = this.props.status.toSent();
    this.props.providerMessageId = providerMessageId;
    this.props.sentAt = new Date();
  }

  recordFailure(error: string): void {
    this.props.attempts += 1;
    this.props.lastError = error.slice(0, MAX_ERROR_LENGTH);
    this.props.status = this.props.status.toFailed();
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get eventId(): string {
    return this.props.eventId;
  }
  get type(): string {
    return this.props.type.value;
  }
  get channel(): string {
    return this.props.channel.value;
  }
  get locale(): string {
    return this.props.locale.value;
  }
  get recipient(): string {
    return this.props.recipient.value;
  }
  get subject(): string {
    return this.props.subject;
  }
  get status(): string {
    return this.props.status.value;
  }
  get attempts(): number {
    return this.props.attempts;
  }
  get lastError(): string | null {
    return this.props.lastError;
  }
  get providerMessageId(): string | null {
    return this.props.providerMessageId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get sentAt(): Date | null {
    return this.props.sentAt;
  }
  get isSent(): boolean {
    return this.props.status.isSent;
  }
  get isFailed(): boolean {
    return this.props.status.isFailed;
  }
}
