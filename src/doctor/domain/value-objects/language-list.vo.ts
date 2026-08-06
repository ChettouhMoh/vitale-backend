import { DomainError } from '@/common/errors/domain.error';
import { DoctorErrorCode } from '../doctor.errors';

const MAX_LANGUAGES = 10;

/**
 * LanguageList — immutable, case-insensitive de-duplicated collection. The max
 * is enforced on post-creation `add`; initial creation is bounded by the DTO's
 * `@ArrayMaxSize`.
 */
export class LanguageList {
  private constructor(private readonly _values: ReadonlyArray<string>) {}

  static from(values: string[]): LanguageList {
    return new LanguageList(LanguageList.dedupe(values));
  }

  private static dedupe(values: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of values) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
    return out;
  }

  add(value: string): LanguageList {
    const next = LanguageList.dedupe([...this._values, value]);
    if (next.length > MAX_LANGUAGES) {
      throw new DomainError(
        DoctorErrorCode.TOO_MANY_LANGUAGES,
        `A doctor may have at most ${MAX_LANGUAGES} languages`,
      );
    }
    return new LanguageList(next);
  }

  remove(value: string): LanguageList {
    const key = value.trim().toLowerCase();
    return new LanguageList(this._values.filter((v) => v.toLowerCase() !== key));
  }

  get values(): string[] {
    return [...this._values];
  }
  get isEmpty(): boolean {
    return this._values.length === 0;
  }
  get count(): number {
    return this._values.length;
  }
}
