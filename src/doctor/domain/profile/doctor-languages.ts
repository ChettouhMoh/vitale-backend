import { LanguageList } from '../value-objects';

/** DoctorLanguages — its own document keyed by doctorId. */
export interface DoctorLanguagesRecord {
  doctorId: string;
  languages: string[];
  updatedAt: Date;
}

export class DoctorLanguages {
  private constructor(
    private readonly _doctorId: string,
    private _languages: LanguageList,
    private _updatedAt: Date,
  ) {}

  static createEmpty(doctorId: string): DoctorLanguages {
    return new DoctorLanguages(doctorId, LanguageList.from([]), new Date());
  }

  static restoreExisting(record: DoctorLanguagesRecord): DoctorLanguages {
    return new DoctorLanguages(
      record.doctorId,
      LanguageList.from(record.languages),
      record.updatedAt,
    );
  }

  toRecord(): DoctorLanguagesRecord {
    return {
      doctorId: this._doctorId,
      languages: this._languages.values,
      updatedAt: this._updatedAt,
    };
  }

  replace(values: string[]): void {
    this._languages = LanguageList.from(values);
    this._updatedAt = new Date();
  }

  get doctorId(): string {
    return this._doctorId;
  }
  get languages(): string[] {
    return this._languages.values;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
}
