import { v7 as uuidv7 } from 'uuid';
import {
  AccountStatus,
  PracticeAffiliation,
  VerificationStatus,
  VerificationStatusValue,
  WorkplaceType,
} from './value-objects';

// ─── Shared shapes ──────────────────────────────────────────────────────────

/**
 * DTO-guaranteed primitives for a brand-new doctor (password already hashed).
 * Signup collects only these — everything else (license, practiceStartYear,
 * avatar, affiliation, verifiedBy) starts null/default and is filled in later.
 */
export interface CreateDoctorPayload {
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  specialty: string;
}

/** Persisted doctor row — storage-agnostic; ids are opaque strings. */
export interface DoctorRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  avatarAttachmentId: string | null;
  specialty: string;
  medicalLicenseNumber: string | null;
  practiceStartYear: number | null;
  affiliationName: string | null;
  affiliationType: string;
  affiliationDepartment: string | null;
  accountStatus: string;
  verificationStatus: string;
  verificationRejectionReason: string | null;
  verifiedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DoctorProps {
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  avatarAttachmentId: string | null;
  specialty: string;
  medicalLicenseNumber: string | null;
  practiceStartYear: number | null;
  affiliation: PracticeAffiliation;
  accountStatus: AccountStatus;
  verificationStatus: VerificationStatus;
  verifiedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Aggregate root ─────────────────────────────────────────────────────────

export class Doctor {
  private readonly _id: string;
  private props: DoctorProps;

  private constructor(props: DoctorProps, id: string) {
    this._id = id;
    this.props = props;
  }

  /**
   * Trusts DTO guarantees. Only name/email/password/phone/specialty are set at
   * signup; the rest is null/default. The id is the only place UUID v7 is
   * generated. verificationStatus starts `unverified`, accountStatus `pending`.
   */
  static createNew(payload: CreateDoctorPayload): Doctor {
    const now = new Date();
    return new Doctor(
      {
        email: payload.email.trim().toLowerCase(),
        passwordHash: payload.passwordHash,
        fullName: payload.fullName.trim(),
        phone: payload.phone?.trim() || null,
        avatarAttachmentId: null,
        specialty: payload.specialty.trim(),
        medicalLicenseNumber: null,
        practiceStartYear: null,
        affiliation: PracticeAffiliation.create(
          null,
          WorkplaceType.Independent,
          null,
        ),
        accountStatus: AccountStatus.pending(),
        verificationStatus: VerificationStatus.create(
          VerificationStatusValue.Unverified,
        ),
        verifiedBy: null,
        createdAt: now,
        updatedAt: now,
      },
      uuidv7(),
    );
  }

  /** Re-validates — DB data carries no DTO guarantee. */
  static restoreExisting(record: DoctorRecord): Doctor {
    return new Doctor(
      {
        email: record.email,
        passwordHash: record.passwordHash,
        fullName: record.fullName,
        phone: record.phone,
        avatarAttachmentId: record.avatarAttachmentId,
        specialty: record.specialty,
        medicalLicenseNumber: record.medicalLicenseNumber,
        practiceStartYear: record.practiceStartYear,
        affiliation: PracticeAffiliation.create(
          record.affiliationName,
          record.affiliationType,
          record.affiliationDepartment,
        ),
        accountStatus: AccountStatus.create(record.accountStatus),
        verificationStatus: VerificationStatus.create(
          record.verificationStatus,
          record.verificationRejectionReason,
        ),
        verifiedBy: record.verifiedBy,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      record.id,
    );
  }

  toRecord(): DoctorRecord {
    return {
      id: this._id,
      email: this.props.email,
      passwordHash: this.props.passwordHash,
      fullName: this.props.fullName,
      phone: this.props.phone,
      avatarAttachmentId: this.props.avatarAttachmentId,
      specialty: this.props.specialty,
      medicalLicenseNumber: this.props.medicalLicenseNumber,
      practiceStartYear: this.props.practiceStartYear,
      affiliationName: this.props.affiliation.name,
      affiliationType: this.props.affiliation.type,
      affiliationDepartment: this.props.affiliation.department,
      accountStatus: this.props.accountStatus.value,
      verificationStatus: this.props.verificationStatus.value,
      verificationRejectionReason: this.props.verificationStatus.rejectionReason,
      verifiedBy: this.props.verifiedBy,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  // ─── Behaviours ─────────────────────────────────────────────────────────────

  updateIdentity(fullName: string, practiceStartYear: number | null): void {
    this.props.fullName = fullName.trim();
    this.props.practiceStartYear = practiceStartYear;
    this.touch();
  }

  updateContact(phone: string | null): void {
    this.props.phone = phone?.trim() || null;
    this.touch();
  }

  updateCredentials(specialty: string, licenseNumber: string | null): void {
    this.props.specialty = specialty.trim();
    this.props.medicalLicenseNumber = licenseNumber?.trim() || null;
    this.touch();
  }

  updateAffiliation(
    name: string | null,
    type: WorkplaceType | string,
    department: string | null,
  ): void {
    this.props.affiliation = PracticeAffiliation.create(name, type, department);
    this.touch();
  }

  setAvatar(attachmentId: string | null): void {
    this.props.avatarAttachmentId = attachmentId;
    this.touch();
  }

  /** Doctor submits KYC → moves to `pending`; clears any prior verifier. */
  submitForVerification(): void {
    this.props.verificationStatus = this.props.verificationStatus.submit();
    this.props.verifiedBy = null;
    this.touch();
  }

  /** Admin decision: approve. Records who approved and activates the account. */
  approveVerification(adminId: string): void {
    this.props.verificationStatus = this.props.verificationStatus.approve();
    this.props.accountStatus = this.props.accountStatus.activate();
    this.props.verifiedBy = adminId;
    this.touch();
  }

  /** Admin decision: reject with a reason. Records who rejected. */
  rejectVerification(adminId: string, reason: string): void {
    this.props.verificationStatus = this.props.verificationStatus.reject(reason);
    this.props.verifiedBy = adminId;
    this.touch();
  }

  suspend(): void {
    this.props.accountStatus = this.props.accountStatus.suspend();
    this.touch();
  }

  reactivate(): void {
    this.props.accountStatus = this.props.accountStatus.reactivate();
    this.touch();
  }

  // ─── Getters (passwordHash intentionally NOT exposed) ────────────────────────

  get id(): string {
    return this._id;
  }
  get email(): string {
    return this.props.email;
  }
  get fullName(): string {
    return this.props.fullName;
  }
  get phone(): string | null {
    return this.props.phone;
  }
  get avatarAttachmentId(): string | null {
    return this.props.avatarAttachmentId;
  }
  get specialty(): string {
    return this.props.specialty;
  }
  get medicalLicenseNumber(): string | null {
    return this.props.medicalLicenseNumber;
  }
  get practiceStartYear(): number | null {
    return this.props.practiceStartYear;
  }
  get affiliationName(): string | null {
    return this.props.affiliation.name;
  }
  get affiliationType(): WorkplaceType {
    return this.props.affiliation.type;
  }
  get affiliationDepartment(): string | null {
    return this.props.affiliation.department;
  }
  get accountStatus(): string {
    return this.props.accountStatus.value;
  }
  get verificationStatus(): string {
    return this.props.verificationStatus.value;
  }
  get verificationRejectionReason(): string | null {
    return this.props.verificationStatus.rejectionReason;
  }
  get verifiedBy(): string | null {
    return this.props.verifiedBy;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
