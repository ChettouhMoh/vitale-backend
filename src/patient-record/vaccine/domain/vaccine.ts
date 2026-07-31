import { v7 as uuidv7 } from 'uuid';

// ─── Shared shapes ──────────────────────────────────────────────────────────

/** Raw primitives from the add DTO (already structurally validated upstream). */
export interface AddVaccinePayload {
  name: string;
  dose: string;
  status: string;
  dateGiven?: string | null; // ISO "YYYY-MM-DD" — only for completed
  dueDate: string; // ISO "YYYY-MM-DD"
  location: string;
  notes?: string | null;
}

/**
 * Partial patch for update — every field optional. `name` is NOT updatable
 * (it identifies the vaccine). `undefined` = untouched; explicit `null` on
 * dateGiven / notes clears it.
 */
export interface UpdateVaccinePayload {
  dose?: string;
  status?: string;
  dateGiven?: string | null;
  dueDate?: string;
  location?: string;
  notes?: string | null;
}

/** Persisted vaccine row — storage-agnostic. */
export interface VaccineRecord {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  status: string;
  dateGiven: string | null;
  dueDate: string;
  location: string;
  notes: string | null;
  createdAt: string; // ISO timestamp
}

interface VaccineProps {
  patientId: string;
  name: string;
  dose: string;
  status: string;
  dateGiven: string | null;
  dueDate: string;
  location: string;
  notes: string | null;
  createdAt: string;
}

// ─── Aggregate root ─────────────────────────────────────────────────────────

export class Vaccine {
  private readonly _id: string;
  private props: VaccineProps;

  private constructor(props: VaccineProps, id: string) {
    this._id = id;
    this.props = props;
  }

  /** New vaccine for a patient — generates a UUID v7 id and a createdAt stamp. */
  static createNew(patientId: string, payload: AddVaccinePayload): Vaccine {
    return new Vaccine(
      {
        patientId,
        name: payload.name.trim(),
        dose: payload.dose.trim(),
        status: payload.status,
        dateGiven: payload.dateGiven ?? null,
        dueDate: payload.dueDate,
        location: payload.location.trim(),
        notes: payload.notes?.trim() || null,
        createdAt: new Date().toISOString(),
      },
      uuidv7(),
    );
  }

  /** Rehydrate from a persisted record (id + createdAt preserved). */
  static restoreExisting(record: VaccineRecord): Vaccine {
    return new Vaccine(
      {
        patientId: record.patientId,
        name: record.name,
        dose: record.dose,
        status: record.status,
        dateGiven: record.dateGiven,
        dueDate: record.dueDate,
        location: record.location,
        notes: record.notes,
        createdAt: record.createdAt,
      },
      record.id,
    );
  }

  /**
   * Partial merge — only provided (defined) fields overwrite; the rest stay.
   * `name` and `createdAt` are never mutated. An explicit `null` on
   * dateGiven / notes clears the field.
   */
  applyUpdate(patch: UpdateVaccinePayload): void {
    if (patch.dose !== undefined) this.props.dose = patch.dose.trim();
    if (patch.status !== undefined) this.props.status = patch.status;
    if (patch.dateGiven !== undefined) this.props.dateGiven = patch.dateGiven;
    if (patch.dueDate !== undefined) this.props.dueDate = patch.dueDate;
    if (patch.location !== undefined) this.props.location = patch.location.trim();
    if (patch.notes !== undefined) this.props.notes = patch.notes?.trim() || null;
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get patientId(): string {
    return this.props.patientId;
  }
  get name(): string {
    return this.props.name;
  }
  get dose(): string {
    return this.props.dose;
  }
  get status(): string {
    return this.props.status;
  }
  get dateGiven(): string | null {
    return this.props.dateGiven;
  }
  get dueDate(): string {
    return this.props.dueDate;
  }
  get location(): string {
    return this.props.location;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
}
