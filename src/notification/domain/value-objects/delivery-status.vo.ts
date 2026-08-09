import { DomainError } from '@/common/errors/domain.error';
import { NotificationErrorCode } from '@/common/errors/codes/notification.errors';

export enum DeliveryStatusValue {
  Pending = 'pending',
  Sent = 'sent',
  Failed = 'failed',
}

/**
 * DeliveryStatus — immutable VO owning the delivery state machine. Legal moves:
 * pending → sent, pending → failed, failed → sent (a retry succeeding). `sent`
 * is terminal; any transition out of it throws INVALID_DELIVERY_TRANSITION.
 */
export class DeliveryStatus {
  private constructor(private readonly _value: DeliveryStatusValue) {}

  static create(value: string): DeliveryStatus {
    const match = Object.values(DeliveryStatusValue).find((s) => s === value);
    if (!match) {
      throw new DomainError(
        NotificationErrorCode.INVALID_DELIVERY_TRANSITION,
        `Unknown delivery status: ${value}`,
      );
    }
    return new DeliveryStatus(match);
  }

  static pending(): DeliveryStatus {
    return new DeliveryStatus(DeliveryStatusValue.Pending);
  }

  toSent(): DeliveryStatus {
    this.assertNotTerminal(DeliveryStatusValue.Sent);
    return new DeliveryStatus(DeliveryStatusValue.Sent);
  }

  toFailed(): DeliveryStatus {
    this.assertNotTerminal(DeliveryStatusValue.Failed);
    return new DeliveryStatus(DeliveryStatusValue.Failed);
  }

  private assertNotTerminal(target: DeliveryStatusValue): void {
    if (this._value === DeliveryStatusValue.Sent) {
      throw new DomainError(
        NotificationErrorCode.INVALID_DELIVERY_TRANSITION,
        `Cannot move a sent notification to ${target}`,
        409,
      );
    }
  }

  get value(): DeliveryStatusValue {
    return this._value;
  }
  get isPending(): boolean {
    return this._value === DeliveryStatusValue.Pending;
  }
  get isSent(): boolean {
    return this._value === DeliveryStatusValue.Sent;
  }
  get isFailed(): boolean {
    return this._value === DeliveryStatusValue.Failed;
  }
}
