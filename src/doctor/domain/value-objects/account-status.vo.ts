import { DomainError } from '@/common/errors/domain.error';
import { DoctorErrorCode } from '../doctor.errors';

export enum AccountStatusValue {
  Active = 'active',
  Suspended = 'suspended',
  Pending = 'pending',
}

/**
 * AccountStatus — immutable VO. New doctors start `pending` and become `active`
 * when their verification is approved. Only `active` accounts may log in.
 */
export class AccountStatus {
  private constructor(private readonly _value: AccountStatusValue) {}

  static create(value: AccountStatusValue | string): AccountStatus {
    const match = Object.values(AccountStatusValue).find((v) => v === value);
    if (!match) {
      throw new DomainError(
        DoctorErrorCode.INVALID_ACCOUNT_STATUS,
        `Unknown account status: ${value}`,
      );
    }
    return new AccountStatus(match);
  }

  static pending(): AccountStatus {
    return new AccountStatus(AccountStatusValue.Pending);
  }

  activate(): AccountStatus {
    return new AccountStatus(AccountStatusValue.Active);
  }
  suspend(): AccountStatus {
    return new AccountStatus(AccountStatusValue.Suspended);
  }
  reactivate(): AccountStatus {
    return new AccountStatus(AccountStatusValue.Active);
  }

  get value(): AccountStatusValue {
    return this._value;
  }
  get canLogin(): boolean {
    return this._value === AccountStatusValue.Active;
  }
}
