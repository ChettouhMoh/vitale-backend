/**
 * DoctorBio — its own document keyed by doctorId. The extended profile is split
 * into a document per section (bio / expertise / languages / education /
 * schedule) so no single document grows heavy and each can be read/written
 * independently.
 */
export interface DoctorBioRecord {
  doctorId: string;
  bio: string | null;
  updatedAt: Date;
}

export class DoctorBio {
  private constructor(
    private readonly _doctorId: string,
    private _bio: string | null,
    private _updatedAt: Date,
  ) {}

  static createEmpty(doctorId: string): DoctorBio {
    return new DoctorBio(doctorId, null, new Date());
  }

  static restoreExisting(record: DoctorBioRecord): DoctorBio {
    return new DoctorBio(record.doctorId, record.bio, record.updatedAt);
  }

  toRecord(): DoctorBioRecord {
    return {
      doctorId: this._doctorId,
      bio: this._bio,
      updatedAt: this._updatedAt,
    };
  }

  update(bio: string | null): void {
    this._bio = bio?.trim() || null;
    this._updatedAt = new Date();
  }

  get doctorId(): string {
    return this._doctorId;
  }
  get bio(): string | null {
    return this._bio;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
}
