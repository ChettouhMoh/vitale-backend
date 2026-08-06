import { EducationEntry, EducationHistory } from '../value-objects';

/** DoctorEducation — its own document keyed by doctorId. */
export interface DoctorEducationRecord {
  doctorId: string;
  education: EducationEntry[];
  updatedAt: Date;
}

export class DoctorEducation {
  private constructor(
    private readonly _doctorId: string,
    private _education: EducationHistory,
    private _updatedAt: Date,
  ) {}

  static createEmpty(doctorId: string): DoctorEducation {
    return new DoctorEducation(doctorId, EducationHistory.from([]), new Date());
  }

  static restoreExisting(record: DoctorEducationRecord): DoctorEducation {
    return new DoctorEducation(
      record.doctorId,
      EducationHistory.from(record.education),
      record.updatedAt,
    );
  }

  toRecord(): DoctorEducationRecord {
    return {
      doctorId: this._doctorId,
      education: this._education.entries,
      updatedAt: this._updatedAt,
    };
  }

  replace(entries: EducationEntry[]): void {
    this._education = EducationHistory.from(entries);
    this._updatedAt = new Date();
  }

  get doctorId(): string {
    return this._doctorId;
  }
  get education(): EducationEntry[] {
    return this._education.entries;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
}
