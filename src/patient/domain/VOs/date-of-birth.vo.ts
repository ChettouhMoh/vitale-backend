import { PatientErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';

/**
 * DateOfBirth — wraps a Date and enforces domain-level temporal rules.
 *
 * DTO already guarantees the value is a parseable ISO date string (@IsDateString).
 * This VO only enforces what the DTO cannot: the date must be in the past
 * and within a realistic human lifespan.
 */
export class DateOfBirth {
  private readonly _value: Date;

  private constructor(value: Date) {
    this._value = value;
  }

  static create(raw: string | Date): DateOfBirth {
    const date = raw instanceof Date ? raw : new Date(raw);
    const now = new Date();

    if (date >= now) {
      throw new DomainError(
        PatientErrorCode.INVALID_DATE_OF_BIRTH,
        'Date of birth must be in the past',
      );
    }

    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - 130);
    if (date < limit) {
      throw new DomainError(
        PatientErrorCode.INVALID_DATE_OF_BIRTH,
        'Date of birth exceeds the maximum realistic age of 130 years',
      );
    }

    return new DateOfBirth(date);
  }

  /** Age in full years as of today — used in NFC emergency payload */
  get age(): number {
    const today = new Date();
    let age = today.getFullYear() - this._value.getFullYear();
    const m = today.getMonth() - this._value.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < this._value.getDate())) age--;
    return age;
  }

  get value(): Date {
    return this._value;
  }

  get iso(): string {
    return this._value.toISOString();
  }
}
