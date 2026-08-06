import { DomainError } from '@/common/errors/domain.error';
import { DoctorErrorCode } from '../doctor.errors';

const MAX_EDUCATION = 10;

export interface EducationEntry {
  degree: string;
  institution: string;
  year: string; // 4-digit year
}

/**
 * EducationHistory — immutable collection. The DTO validates the 4-digit `year`
 * format; this VO owns the domain rule (no future years), the max size, and
 * descending-by-year ordering on read.
 */
export class EducationHistory {
  private constructor(private readonly _entries: ReadonlyArray<EducationEntry>) {}

  static from(entries: EducationEntry[]): EducationHistory {
    if (entries.length > MAX_EDUCATION) {
      throw new DomainError(
        DoctorErrorCode.TOO_MANY_EDUCATION_ENTRIES,
        `A doctor may have at most ${MAX_EDUCATION} education entries`,
      );
    }

    const currentYear = new Date().getFullYear();
    for (const entry of entries) {
      const year = Number(entry.year);
      if (Number.isFinite(year) && year > currentYear) {
        throw new DomainError(
          DoctorErrorCode.INVALID_EDUCATION_YEAR,
          `Education year ${entry.year} is in the future`,
        );
      }
    }

    const sorted = [...entries]
      .map((e) => ({ ...e }))
      .sort((a, b) => Number(b.year) - Number(a.year));
    return new EducationHistory(sorted);
  }

  replaceAll(entries: EducationEntry[]): EducationHistory {
    return EducationHistory.from(entries);
  }

  get entries(): EducationEntry[] {
    return this._entries.map((e) => ({ ...e }));
  }
  get isEmpty(): boolean {
    return this._entries.length === 0;
  }
  get count(): number {
    return this._entries.length;
  }
}
