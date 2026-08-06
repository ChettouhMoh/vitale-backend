import { DomainError } from '@/common/errors/domain.error';
import { DoctorErrorCode } from '../doctor.errors';

export enum VerificationStatusValue {
  Unverified = 'unverified',
  Pending = 'pending',
  Verified = 'verified',
  Rejected = 'rejected',
}

/** The only transitions the domain permits. */
const ALLOWED: Record<VerificationStatusValue, VerificationStatusValue[]> = {
  [VerificationStatusValue.Unverified]: [VerificationStatusValue.Pending],
  [VerificationStatusValue.Pending]: [
    VerificationStatusValue.Verified,
    VerificationStatusValue.Rejected,
  ],
  [VerificationStatusValue.Rejected]: [VerificationStatusValue.Pending],
  [VerificationStatusValue.Verified]: [],
};

/**
 * VerificationStatus — immutable VO owning the KYC state machine. A rejected
 * status always carries a reason; every other status carries none.
 */
export class VerificationStatus {
  private constructor(
    private readonly _value: VerificationStatusValue,
    private readonly _rejectionReason: string | null,
  ) {}

  static create(
    value: VerificationStatusValue | string,
    rejectionReason: string | null = null,
  ): VerificationStatus {
    const match = Object.values(VerificationStatusValue).find(
      (v) => v === value,
    );
    if (!match) {
      throw new DomainError(
        DoctorErrorCode.INVALID_VERIFICATION_STATUS,
        `Unknown verification status: ${value}`,
      );
    }
    if (match === VerificationStatusValue.Rejected) {
      const reason = rejectionReason?.trim();
      if (!reason) {
        throw new DomainError(
          DoctorErrorCode.VERIFICATION_REASON_REQUIRED,
          'A rejection reason is required for a rejected verification',
        );
      }
      return new VerificationStatus(match, reason);
    }
    return new VerificationStatus(match, null);
  }

  private transitionTo(
    target: VerificationStatusValue,
    reason: string | null,
  ): VerificationStatus {
    if (!ALLOWED[this._value].includes(target)) {
      throw new DomainError(
        DoctorErrorCode.INVALID_VERIFICATION_TRANSITION,
        `Cannot transition verification from ${this._value} to ${target}`,
        409,
      );
    }
    if (target === VerificationStatusValue.Rejected) {
      const clean = reason?.trim();
      if (!clean) {
        throw new DomainError(
          DoctorErrorCode.VERIFICATION_REASON_REQUIRED,
          'A rejection reason is required',
        );
      }
      return new VerificationStatus(target, clean);
    }
    // Moving away from rejected clears the reason.
    return new VerificationStatus(target, null);
  }

  submit(): VerificationStatus {
    return this.transitionTo(VerificationStatusValue.Pending, null);
  }
  approve(): VerificationStatus {
    return this.transitionTo(VerificationStatusValue.Verified, null);
  }
  reject(reason: string): VerificationStatus {
    return this.transitionTo(VerificationStatusValue.Rejected, reason);
  }

  get value(): VerificationStatusValue {
    return this._value;
  }
  get rejectionReason(): string | null {
    return this._rejectionReason;
  }
  get canSubmit(): boolean {
    return (
      this._value === VerificationStatusValue.Unverified ||
      this._value === VerificationStatusValue.Rejected
    );
  }
  get isVerified(): boolean {
    return this._value === VerificationStatusValue.Verified;
  }
}
