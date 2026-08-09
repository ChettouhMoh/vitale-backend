import { DomainError } from '@/common/errors/domain.error';
import { NotificationErrorCode } from '@/common/errors/codes/notification.errors';
import { Channel } from './channel.vo';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d{7,15}$/;

/**
 * Recipient — the destination plus the channel it belongs to. Guards that the
 * address shape matches the channel: an email channel cannot receive a phone
 * number. Email addresses are trimmed and lower-cased.
 */
export class Recipient {
  private constructor(
    private readonly _value: string,
    private readonly _channel: Channel,
  ) {}

  static forChannel(value: string, channel: Channel): Recipient {
    const raw = (value ?? '').trim();

    if (channel.isEmail) {
      const email = raw.toLowerCase();
      if (!EMAIL_RE.test(email)) {
        throw new DomainError(
          NotificationErrorCode.INVALID_RECIPIENT,
          `Recipient "${value}" is not a valid email address`,
        );
      }
      return new Recipient(email, channel);
    }

    if (channel.isSms) {
      if (!PHONE_RE.test(raw)) {
        throw new DomainError(
          NotificationErrorCode.INVALID_RECIPIENT,
          `Recipient "${value}" is not a valid phone number`,
        );
      }
      return new Recipient(raw, channel);
    }

    // push — a device token; only non-emptiness is checkable here.
    if (!raw) {
      throw new DomainError(
        NotificationErrorCode.INVALID_RECIPIENT,
        'Recipient device token is empty',
      );
    }
    return new Recipient(raw, channel);
  }

  get value(): string {
    return this._value;
  }
  get channel(): Channel {
    return this._channel;
  }
}
