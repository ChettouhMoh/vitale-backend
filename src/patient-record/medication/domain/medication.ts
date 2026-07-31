import { v7 as uuidv7 } from 'uuid';

// ─── Shared shapes ──────────────────────────────────────────────────────────

/** Raw primitives from the add DTO (already structurally validated upstream). */
export interface AddMedicationPayload {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string; // ISO "YYYY-MM-DD"
  endDate?: string | null;
  status: string;
  instructions?: string | null;
}

/**
 * Partial patch for update — every field optional. A field left `undefined` is
 * untouched; an explicit `null` (endDate / instructions) clears it.
 */
export interface UpdateMedicationPayload {
  // name is intentionally not updatable — it identifies the medication.
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  endDate?: string | null;
  status?: string;
  instructions?: string | null;
}

/** Persisted medication row — storage-agnostic. */
export interface MedicationRecord {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate: string | null;
  status: string;
  instructions: string | null;
}

interface MedicationProps {
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate: string | null;
  status: string;
  instructions: string | null;
}

// ─── Aggregate root ─────────────────────────────────────────────────────────

export class Medication {
  private readonly _id: string;
  private props: MedicationProps;

  private constructor(props: MedicationProps, id: string) {
    this._id = id;
    this.props = props;
  }

  /** New medication for a patient — generates a UUID v7 id. */
  static createNew(patientId: string, payload: AddMedicationPayload): Medication {
    return new Medication(
      {
        patientId,
        name: payload.name.trim(),
        dosage: payload.dosage.trim(),
        frequency: payload.frequency.trim(),
        route: payload.route,
        startDate: payload.startDate,
        endDate: payload.endDate ?? null,
        status: payload.status,
        instructions: payload.instructions?.trim() || null,
      },
      uuidv7(),
    );
  }

  /** Rehydrate from a persisted record (id preserved). */
  static restoreExisting(record: MedicationRecord): Medication {
    return new Medication(
      {
        patientId: record.patientId,
        name: record.name,
        dosage: record.dosage,
        frequency: record.frequency,
        route: record.route,
        startDate: record.startDate,
        endDate: record.endDate,
        status: record.status,
        instructions: record.instructions,
      },
      record.id,
    );
  }

  /**
   * Partial merge — only provided (defined) fields overwrite; the rest stay.
   * Mirrors the mock's `{ ...found, ...data }`. An explicit `null` on
   * endDate / instructions clears the field.
   */
  applyUpdate(patch: UpdateMedicationPayload): void {
    if (patch.dosage !== undefined) this.props.dosage = patch.dosage.trim();
    if (patch.frequency !== undefined) this.props.frequency = patch.frequency.trim();
    if (patch.route !== undefined) this.props.route = patch.route;
    if (patch.startDate !== undefined) this.props.startDate = patch.startDate;
    if (patch.endDate !== undefined) this.props.endDate = patch.endDate;
    if (patch.status !== undefined) this.props.status = patch.status;
    if (patch.instructions !== undefined) {
      this.props.instructions = patch.instructions?.trim() || null;
    }
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
  get dosage(): string {
    return this.props.dosage;
  }
  get frequency(): string {
    return this.props.frequency;
  }
  get route(): string {
    return this.props.route;
  }
  get startDate(): string {
    return this.props.startDate;
  }
  get endDate(): string | null {
    return this.props.endDate;
  }
  get status(): string {
    return this.props.status;
  }
  get instructions(): string | null {
    return this.props.instructions;
  }
}
