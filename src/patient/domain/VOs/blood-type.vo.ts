import { PatientErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';

export enum BloodTypeValue {
  APositive = 'A+',
  ANegative = 'A-',
  BPositive = 'B+',
  BNegative = 'B-',
  ABPositive = 'AB+',
  ABNegative = 'AB-',
  OPositive = 'O+',
  ONegative = 'O-',
}

/**
 * BloodType — critical for the NFC emergency payload.
 *
 * DTO guarantees @IsEnum(BloodTypeValue), so create() from a DTO-validated
 * value is a trusted construction. The guard here protects the restoreExisting()
 * path where data comes from the DB without DTO validation.
 */
export class BloodType {
  private readonly _value: BloodTypeValue;

  private constructor(value: BloodTypeValue) {
    this._value = value;
  }

  static create(value: BloodTypeValue | string): BloodType {
    const valid = Object.values(BloodTypeValue).find((bt) => bt === value) as
      | BloodTypeValue
      | undefined;

    if (!valid) {
      throw new DomainError(
        PatientErrorCode.INVALID_BLOOD_TYPE,
        `Invalid blood type: ${value}`,
      );
    }

    return new BloodType(valid);
  }

  /** Universal donor — O- can donate to any blood type, relevant in emergencies */
  get isUniversalDonor(): boolean {
    return this._value === BloodTypeValue.ONegative;
  }

  get value(): BloodTypeValue {
    return this._value;
  }
}
