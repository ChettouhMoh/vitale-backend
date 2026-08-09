import { DomainError } from '@/common/errors/domain.error';
import { NotificationErrorCode } from '@/common/errors/codes/notification.errors';
export enum ChannelValue {
  Email = 'email',
  Sms = 'sms',
  Push = 'push',
}

/**
 * Channel — how a notification reaches a human. Only `email` is implemented; the
 * other two exist so the abstraction is real from day one.
 */
export class Channel {
  private constructor(private readonly _value: ChannelValue) {}

  static create(value: string): Channel {
    const match = Object.values(ChannelValue).find((c) => c === value);
    if (!match) {
      throw new DomainError(
        NotificationErrorCode.UNSUPPORTED_CHANNEL,
        `Unsupported channel: ${value}`,
      );
    }
    return new Channel(match);
  }

  static email(): Channel {
    return new Channel(ChannelValue.Email);
  }

  get value(): ChannelValue {
    return this._value;
  }
  get isEmail(): boolean {
    return this._value === ChannelValue.Email;
  }
  get isSms(): boolean {
    return this._value === ChannelValue.Sms;
  }
  get isPush(): boolean {
    return this._value === ChannelValue.Push;
  }
}
