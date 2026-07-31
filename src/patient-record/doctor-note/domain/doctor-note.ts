import { v7 as uuidv7 } from 'uuid';

// ─── Shared shapes ──────────────────────────────────────────────────────────

/**
 * Denormalized doctor snapshot stored ON the note.
 *
 * DESIGN: doctor-notes live in their own store (Mongo), optimized for fast
 * read/write. To avoid a join back to the primary (doctor) DB on every read, we
 * copy the author's identity onto the note at write time. This is a deliberate
 * denormalization — the snapshot reflects the doctor AS OF note creation and is
 * NOT kept in sync if the doctor later edits their profile.
 */
export interface DoctorSnapshot {
  doctorId: string;
  doctorName: string;
  specialty: string;
  doctorAvatar: string;
}

/**
 * Raw primitives from the add DTO — includes the denormalized doctor snapshot
 * (the frontend supplies it from the signed-in user's store).
 */
export interface AddDoctorNotePayload extends DoctorSnapshot {
  type: string;
  title: string;
  content: string;
}

/**
 * Update payload — ONLY the note's own content fields. The doctor snapshot is
 * captured once at creation and is never re-sent or mutated on update.
 */
export interface UpdateDoctorNotePayload {
  type?: string;
  title?: string;
  content?: string;
}

/** Persisted note document — storage-agnostic. */
export interface DoctorNoteRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  doctorAvatar: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
}

interface DoctorNoteProps {
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  doctorAvatar: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
}

// ─── Aggregate root ─────────────────────────────────────────────────────────

export class DoctorNote {
  private readonly _id: string;
  private props: DoctorNoteProps;

  private constructor(props: DoctorNoteProps, id: string) {
    this._id = id;
    this.props = props;
  }

  /**
   * New note for a patient — generates a UUID v7 id, stamps createdAt, and
   * freezes the author snapshot passed in from the caller.
   */
  static createNew(patientId: string, payload: AddDoctorNotePayload): DoctorNote {
    return new DoctorNote(
      {
        patientId,
        doctorId: payload.doctorId,
        doctorName: payload.doctorName.trim(),
        specialty: payload.specialty.trim(),
        doctorAvatar: payload.doctorAvatar.trim(),
        type: payload.type,
        title: payload.title.trim(),
        content: payload.content.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: null,
      },
      uuidv7(),
    );
  }

  /** Rehydrate from a persisted record (id + snapshot + timestamps preserved). */
  static restoreExisting(record: DoctorNoteRecord): DoctorNote {
    return new DoctorNote(
      {
        patientId: record.patientId,
        doctorId: record.doctorId,
        doctorName: record.doctorName,
        specialty: record.specialty,
        doctorAvatar: record.doctorAvatar,
        type: record.type,
        title: record.title,
        content: record.content,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      record.id,
    );
  }

  /**
   * Partial content update — only note fields change; the doctor snapshot is
   * never touched. Any applied change stamps updatedAt.
   */
  applyUpdate(patch: UpdateDoctorNotePayload): void {
    let changed = false;
    if (patch.type !== undefined) {
      this.props.type = patch.type;
      changed = true;
    }
    if (patch.title !== undefined) {
      this.props.title = patch.title.trim();
      changed = true;
    }
    if (patch.content !== undefined) {
      this.props.content = patch.content.trim();
      changed = true;
    }
    if (changed) this.props.updatedAt = new Date().toISOString();
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get patientId(): string {
    return this.props.patientId;
  }
  get doctorId(): string {
    return this.props.doctorId;
  }
  get doctorName(): string {
    return this.props.doctorName;
  }
  get specialty(): string {
    return this.props.specialty;
  }
  get doctorAvatar(): string {
    return this.props.doctorAvatar;
  }
  get type(): string {
    return this.props.type;
  }
  get title(): string {
    return this.props.title;
  }
  get content(): string {
    return this.props.content;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }
  get updatedAt(): string | null {
    return this.props.updatedAt;
  }
}
