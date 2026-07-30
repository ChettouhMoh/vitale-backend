import { v7 as uuidv7 } from 'uuid';

// ─── Shared shapes ──────────────────────────────────────────────────────────

export interface EmergencyContact {
  name: string;
  phone: string; // E.164, e.g. "+213551234567"
}

/**
 * Raw primitives from the create DTO — already structurally validated upstream
 * by class-validator. The domain only fills in derived data (id, default avatar).
 * Field names mirror the dashboard mock (`PatientBasicInfo`).
 */
export interface CreatePatientPayload {
  name: string;
  dateOfBirth: string; // ISO "YYYY-MM-DD"
  gender: string;
  bloodType: string;
  nationalId?: string | null;
  avatarUrl?: string | null;
  allergies?: string[];
  chronicDiseases?: string[];
  emergencyContact?: EmergencyContact | null;
}

/**
 * Shape of a persisted patient row passed to restoreExisting().
 * Storage-agnostic — any persistence layer maps its record to this interface.
 */
export interface PatientRecord {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  nationalId: string | null;
  avatarUrl: string | null;
  allergies: string[];
  chronicDiseases: string[];
  emergencyContact: EmergencyContact | null;
}

interface PatientProps {
  name: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  nationalId: string | null;
  avatarUrl: string | null;
  allergies: string[];
  chronicDiseases: string[];
  emergencyContact: EmergencyContact | null;
}

// ─── Aggregate root ─────────────────────────────────────────────────────────

export class Patient {
  private readonly _id: string;
  private props: PatientProps;

  private constructor(props: PatientProps, id: string) {
    this._id = id;
    this.props = props;
  }

  /**
   * Creates a brand-new patient from DTO-validated data.
   * Generates a UUID v7 id and a default avatar when none was supplied.
   */
  static createNew(payload: CreatePatientPayload): Patient {
    const name = payload.name.trim();
    return new Patient(
      {
        name,
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender,
        bloodType: payload.bloodType,
        nationalId: payload.nationalId?.trim() || null,
        avatarUrl: payload.avatarUrl?.trim() || Patient.defaultAvatarUrl(name),
        allergies: payload.allergies ?? [],
        chronicDiseases: payload.chronicDiseases ?? [],
        emergencyContact: payload.emergencyContact ?? null,
      },
      uuidv7(),
    );
  }

  /** Rehydrates a Patient from a persisted record (id preserved). */
  static restoreExisting(record: PatientRecord): Patient {
    return new Patient(
      {
        name: record.name,
        dateOfBirth: record.dateOfBirth,
        gender: record.gender,
        bloodType: record.bloodType,
        nationalId: record.nationalId,
        avatarUrl: record.avatarUrl,
        allergies: record.allergies,
        chronicDiseases: record.chronicDiseases,
        emergencyContact: record.emergencyContact,
      },
      record.id,
    );
  }

  /**
   * Default avatar — a DiceBear "initials" tile seeded with the full name, e.g.
   * https://api.dicebear.com/9.x/initials/svg?seed=Soulaf%20Ayad
   */
  private static defaultAvatarUrl(name: string): string {
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get name(): string {
    return this.props.name;
  }
  get dateOfBirth(): string {
    return this.props.dateOfBirth;
  }
  get gender(): string {
    return this.props.gender;
  }
  get bloodType(): string {
    return this.props.bloodType;
  }
  get nationalId(): string | null {
    return this.props.nationalId;
  }
  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }
  get allergies(): string[] {
    return this.props.allergies;
  }
  get chronicDiseases(): string[] {
    return this.props.chronicDiseases;
  }
  get emergencyContact(): EmergencyContact | null {
    return this.props.emergencyContact;
  }

  /** Masked NIN — always use this for logs; never log the raw value. */
  get maskedNationalId(): string | null {
    const nin = this.props.nationalId;
    if (!nin) return null;
    return `${nin.slice(0, 2)}${'*'.repeat(Math.max(0, nin.length - 4))}${nin.slice(-2)}`;
  }
}
