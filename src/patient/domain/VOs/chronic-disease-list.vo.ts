import { PatientErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';

/**
 * ChronicDiseaseList — same contract as AllergyList.
 *
 * DTO handles structural validation on the initial array.
 * VO handles duplicate detection and post-creation size guard.
 */
export class ChronicDiseaseList {
  static readonly MAX = 20;

  private constructor(private readonly _items: string[]) {}

  static createEmpty(): ChronicDiseaseList {
    return new ChronicDiseaseList([]);
  }

  static from(values: string[]): ChronicDiseaseList {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const v of values) {
      const key = v.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(v.trim());
      }
    }

    return new ChronicDiseaseList(unique);
  }

  add(value: string): ChronicDiseaseList {
    if (this._items.length >= ChronicDiseaseList.MAX) {
      throw new DomainError(
        PatientErrorCode.INVALID_CHRONIC_DISEASE,
        `Cannot exceed ${ChronicDiseaseList.MAX} chronic diseases`,
      );
    }

    const trimmed = value.trim();
    const isDuplicate = this._items.some(
      (d) => d.toLowerCase() === trimmed.toLowerCase(),
    );

    if (isDuplicate) return this;

    return new ChronicDiseaseList([...this._items, trimmed]);
  }

  remove(value: string): ChronicDiseaseList {
    return new ChronicDiseaseList(
      this._items.filter((d) => d.toLowerCase() !== value.trim().toLowerCase()),
    );
  }

  get values(): string[] {
    return [...this._items];
  }
  get isEmpty(): boolean {
    return this._items.length === 0;
  }
  get count(): number {
    return this._items.length;
  }
}
