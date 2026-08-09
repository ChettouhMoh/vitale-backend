import { DomainError } from '@/common/errors/domain.error';
import { NotificationErrorCode } from '@/common/errors/codes/notification.errors';
import { Channel, ChannelValue } from './channel.vo';

export enum NotificationTypeValue {
  EmailVerification = 'email_verification',
  PasswordReset = 'password_reset',
  PasswordChanged = 'password_changed',
  PendingAccountClaimed = 'pending_account_claimed',
  DoctorWelcome = 'doctor_welcome',
  KycApproved = 'kyc_approved',
  KycRejected = 'kyc_rejected',
}

interface TypeConfig {
  readonly templateName: string;
  readonly defaultChannel: ChannelValue;
}

/**
 * The catalogue. Each type maps to a template name (which matches the `.hbs`
 * filename) and a default channel. Adding a type is one row here plus three
 * `.hbs` files and one handler.
 */
const CATALOGUE: Record<NotificationTypeValue, TypeConfig> = {
  [NotificationTypeValue.EmailVerification]: {
    templateName: 'email-verification',
    defaultChannel: ChannelValue.Email,
  },
  [NotificationTypeValue.PasswordReset]: {
    templateName: 'password-reset',
    defaultChannel: ChannelValue.Email,
  },
  [NotificationTypeValue.PasswordChanged]: {
    templateName: 'password-changed',
    defaultChannel: ChannelValue.Email,
  },
  [NotificationTypeValue.PendingAccountClaimed]: {
    templateName: 'pending-account-claimed',
    defaultChannel: ChannelValue.Email,
  },
  [NotificationTypeValue.DoctorWelcome]: {
    templateName: 'doctor-welcome',
    defaultChannel: ChannelValue.Email,
  },
  [NotificationTypeValue.KycApproved]: {
    templateName: 'kyc-approved',
    defaultChannel: ChannelValue.Email,
  },
  [NotificationTypeValue.KycRejected]: {
    templateName: 'kyc-rejected',
    defaultChannel: ChannelValue.Email,
  },
};

export class NotificationType {
  private constructor(private readonly _value: NotificationTypeValue) {}

  static create(value: string): NotificationType {
    const match = Object.values(NotificationTypeValue).find((t) => t === value);
    if (!match) {
      // Should-never-happen integrity guard: callers pass the enum, and stored
      // values are ours. A stored value not in the catalogue is corrupt data.
      throw new DomainError(
        NotificationErrorCode.NOTIFICATION_NOT_FOUND,
        `Unknown notification type: ${value}`,
      );
    }
    return new NotificationType(match);
  }

  private get config(): TypeConfig {
    return CATALOGUE[this._value];
  }

  get value(): NotificationTypeValue {
    return this._value;
  }
  get templateName(): string {
    return this.config.templateName;
  }
  get defaultChannel(): Channel {
    return Channel.create(this.config.defaultChannel);
  }
}
