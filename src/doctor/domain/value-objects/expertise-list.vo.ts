import { DomainError } from '@/common/errors/domain.error';
import { DoctorErrorCode } from '../doctor.errors';

const MAX_EXPERTISE = 20;

/**
 * ExpertiseList — immutable, case-insensitive de-duplicated collection. The max
 * is enforced on post-creation `add`; initial creation is bounded by the DTO's
 * `@ArrayMaxSize`.
 */
export class ExpertiseList {
  private constructor(private readonly _values: ReadonlyArray<string>) {}

  static from(values: string[]): ExpertiseList {
    return new ExpertiseList(ExpertiseList.dedupe(values));
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

  add(value: string): ExpertiseList {
    const next = ExpertiseList.dedupe([...this._values, value]);
    if (next.length > MAX_EXPERTISE) {
      throw new DomainError(
        DoctorErrorCode.TOO_MANY_EXPERTISE_ITEMS,
        `A doctor may have at most ${MAX_EXPERTISE} expertise items`,
      );
    }
    return new ExpertiseList(next);
  }

  remove(value: string): ExpertiseList {
    const key = value.trim().toLowerCase();
    return new ExpertiseList(
      this._values.filter((v) => v.toLowerCase() !== key),
    );
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
