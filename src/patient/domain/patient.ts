import { v7 as uuidv7 } from 'uuid';
import {
  AllergyList,
  BloodType,
  BloodTypeValue,
  ChronicDiseaseList,
  DateOfBirth,
  EmergencyContact,
  NationalIdNumber,
} from '.';

// ─── Payload shapes ───────────────────────────────────────────────────────────

/**
 * Raw primitives from the DTO — structurally validated upstream.
 * VOs only enforce domain-level semantics on top of these.
 */
export interface CreatePatientPayload {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  bloodType: BloodTypeValue;
  nationalIdNumber?: string | null; // optional — citizen may add later
  avatarUrl?: string | null;
  allergies?: string[];
  chronicDiseases?: string[];
  emergencyContact: {
    name: string;
    phone: string; // pre-merged E.164 from frontend
  };
}

/**
 * Shape of a raw DB record passed to restoreExisting().
 * ORM-agnostic — any persistence layer maps its row to this interface.
 */
export interface PatientRecord {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  nationalIdNumber: string | null;
  avatarUrl: string | null;
  allergies: string[];
  chronicDiseases: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  createdAt: Date;
}

// ─── Internal props ───────────────────────────────────────────────────────────

interface PatientProps {
  // Primitives — no domain behavior beyond what the DTO already guaranteed
  fullName: string;
  gender: string;
  avatarUrl: string | null;

  // Value Objects — carry domain behaviors or semantic rules
  dateOfBirth: DateOfBirth;
  bloodType: BloodType;
  nationalIdNumber: NationalIdNumber | null;
  emergencyContact: EmergencyContact;
  allergies: AllergyList;
  chronicDiseases: ChronicDiseaseList;

  createdAt: Date;
}

// ─── NFC payload type ─────────────────────────────────────────────────────────

export interface NfcEmergencyPayload {
  patientId: string;
  fullName: string;
  dateOfBirth: string;
  bloodType: string;
  isUniversalDonor: boolean;
  allergies: string[];
  chronicDiseases: string[];
  emergencyContact: { name: string; phone: string };
}

// ─── Aggregate root ───────────────────────────────────────────────────────────

export class Patient {
  private readonly _id: string;
  private props: PatientProps;

  private constructor(props: PatientProps, id?: string) {
    this._id = id ?? uuidv7();
    this.props = props;
  }

  // ─── Factories ──────────────────────────────────────────────────────────────

  /**
   * Creates a brand-new patient from DTO-validated data.
   * VOs validate domain semantics — any violation throws a DomainError
   * caught by the global exception filter → 400.
   */
  static createNew(payload: CreatePatientPayload): Patient {
    return new Patient({
      fullName: payload.fullName.trim(),
      gender: payload.gender,
      avatarUrl: payload.avatarUrl?.trim() ?? null,

      dateOfBirth: DateOfBirth.create(payload.dateOfBirth),
      bloodType: BloodType.create(payload.bloodType),

      nationalIdNumber: payload.nationalIdNumber
        ? NationalIdNumber.create(payload.nationalIdNumber)
        : null,

      emergencyContact: EmergencyContact.create(
        payload.emergencyContact.name,
        payload.emergencyContact.phone,
      ),

      allergies: AllergyList.from(payload.allergies ?? []),
      chronicDiseases: ChronicDiseaseList.from(payload.chronicDiseases ?? []),

      createdAt: new Date(),
    });
  }

  /**
   * Rehydrates a Patient from a DB record.
   * VOs re-validate on this path — DB data is not DTO-guaranteed.
   */
  static restoreExisting(record: PatientRecord): Patient {
    return new Patient(
      {
        fullName: record.fullName,
        gender: record.gender,
        avatarUrl: record.avatarUrl,

        dateOfBirth: DateOfBirth.create(record.dateOfBirth),
        bloodType: BloodType.create(record.bloodType),

        nationalIdNumber: record.nationalIdNumber
          ? NationalIdNumber.create(record.nationalIdNumber)
          : null,

        emergencyContact: EmergencyContact.fromRecord(
          record.emergencyContactName,
          record.emergencyContactPhone,
        ),

        allergies: AllergyList.from(record.allergies),
        chronicDiseases: ChronicDiseaseList.from(record.chronicDiseases),

        createdAt: record.createdAt,
      },
      record.id,
    );
  }

  // ─── Domain behaviors ────────────────────────────────────────────────────────

  addAllergy(value: string): void {
    this.props.allergies = this.props.allergies.add(value);
  }

  removeAllergy(value: string): void {
    this.props.allergies = this.props.allergies.remove(value);
  }

  addChronicDisease(value: string): void {
    this.props.chronicDiseases = this.props.chronicDiseases.add(value);
  }

  removeChronicDisease(value: string): void {
    this.props.chronicDiseases = this.props.chronicDiseases.remove(value);
  }

  updateEmergencyContact(name: string, phone: string): void {
    this.props.emergencyContact = EmergencyContact.create(name, phone);
  }

  updateAvatar(url: string | null): void {
    this.props.avatarUrl = url?.trim() ?? null;
  }

  linkNin(nin: string): void {
    this.props.nationalIdNumber = NationalIdNumber.create(nin);
  }

  // ─── NFC emergency payload ───────────────────────────────────────────────────

  /**
   * Minimal data written to the NFC card.
   * Fast to read in an emergency — no PII beyond what a first responder needs.
   * NIN is intentionally excluded.
   */
  toNfcEmergencyPayload(): NfcEmergencyPayload {
    return {
      patientId: this._id,
      fullName: this.props.fullName,
      dateOfBirth: this.props.dateOfBirth.iso,
      bloodType: this.props.bloodType.value,
      isUniversalDonor: this.props.bloodType.isUniversalDonor,
      allergies: this.props.allergies.values,
      chronicDiseases: this.props.chronicDiseases.values,
      emergencyContact: {
        name: this.props.emergencyContact.name,
        phone: this.props.emergencyContact.phone,
      },
    };
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get fullName(): string {
    return this.props.fullName;
  }
  get gender(): string {
    return this.props.gender;
  }
  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }
  get dateOfBirth(): Date {
    return this.props.dateOfBirth.value;
  }

  get bloodType(): string {
    return this.props.bloodType.value;
  }
  get allergies(): string[] {
    return this.props.allergies.values;
  }
  get chronicDiseases(): string[] {
    return this.props.chronicDiseases.values;
  }

  get nationalIdNumber(): string | null {
    return this.props.nationalIdNumber?.value ?? null;
  }

  /** Always use this for logs — never log raw NIN */
  get maskedNin(): string | null {
    return this.props.nationalIdNumber?.masked ?? null;
  }

  get emergencyContactName(): string {
    return this.props.emergencyContact.name;
  }
  get emergencyContactPhone(): string {
    return this.props.emergencyContact.phone;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
