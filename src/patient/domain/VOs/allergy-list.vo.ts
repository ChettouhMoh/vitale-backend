import { PatientErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';

/**
 * AllergyList — immutable, duplicate-free collection of allergy strings.
 *
 * DTO guarantees structural checks on the initial array:
 *   @IsArray, @ArrayMaxSize(30), @IsString({ each }), @IsNotEmpty({ each }),
 *   @MaxLength(100, { each })
 *
 * This VO owns two domain behaviors that the DTO cannot enforce:
 *   1. Case-insensitive duplicate detection across items
 *   2. Max-size guard on post-creation additions (via Patient.addAllergy())
 *      which happen outside any DTO validation path
 */
export class AllergyList {
  static readonly MAX = 30;

  private constructor(private readonly _items: string[]) {}

  static createEmpty(): AllergyList {
    return new AllergyList([]);
  }

  /** Used during Patient.createNew() — DTO already validated the array */
  static from(values: string[]): AllergyList {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const v of values) {
      const key = v.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(v.trim());
      }
    }

    return new AllergyList(unique);
  }

  /** Used post-creation when a patient adds a single allergy via a dedicated endpoint */
  add(value: string): AllergyList {
    if (this._items.length >= AllergyList.MAX) {
      throw new DomainError(
        PatientErrorCode.INVALID_ALLERGY,
        `Cannot exceed ${AllergyList.MAX} allergies`,
      );
    }

    const trimmed = value.trim();
    const isDuplicate = this._items.some(
      (a) => a.toLowerCase() === trimmed.toLowerCase(),
    );

    if (isDuplicate) return this; // idempotent

    return new AllergyList([...this._items, trimmed]);
  }

  remove(value: string): AllergyList {
    return new AllergyList(
      this._items.filter((a) => a.toLowerCase() !== value.trim().toLowerCase()),
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
