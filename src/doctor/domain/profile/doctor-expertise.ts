import { ExpertiseList } from '../value-objects';

/** DoctorExpertise — its own document keyed by doctorId. */
export interface DoctorExpertiseRecord {
  doctorId: string;
  expertise: string[];
  updatedAt: Date;
}

export class DoctorExpertise {
  private constructor(
    private readonly _doctorId: string,
    private _expertise: ExpertiseList,
    private _updatedAt: Date,
  ) {}

  static createEmpty(doctorId: string): DoctorExpertise {
    return new DoctorExpertise(doctorId, ExpertiseList.from([]), new Date());
  }

  static restoreExisting(record: DoctorExpertiseRecord): DoctorExpertise {
    return new DoctorExpertise(
      record.doctorId,
      ExpertiseList.from(record.expertise),
      record.updatedAt,
    );
  }

  toRecord(): DoctorExpertiseRecord {
    return {
      doctorId: this._doctorId,
      expertise: this._expertise.values,
      updatedAt: this._updatedAt,
    };
  }

  replace(values: string[]): void {
    this._expertise = ExpertiseList.from(values);
    this._updatedAt = new Date();
  }

  get doctorId(): string {
    return this._doctorId;
  }
  get expertise(): string[] {
    return this._expertise.values;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
}
