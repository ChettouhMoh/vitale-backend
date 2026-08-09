export enum LocaleValue {
  Fr = 'fr',
  Ar = 'ar',
  En = 'en',
}

/** French is the most common language for Algerian medical professionals. */
const DEFAULT_LOCALE = LocaleValue.Fr;

/**
 * Locale — the language a notification is rendered in. Unlike the other VOs,
 * `create` never throws: a missing or unknown locale must not block a password
 * reset, so it falls back to French. `fellBackToDefault` lets the caller log a
 * warning so bad payloads stay visible.
 */
export class Locale {
  private constructor(
    private readonly _value: LocaleValue,
    private readonly _fellBack: boolean,
  ) {}

  static create(value: string | null | undefined): Locale {
    const match = Object.values(LocaleValue).find((l) => l === value);
    if (!match) {
      return new Locale(DEFAULT_LOCALE, true);
    }
    return new Locale(match, false);
  }

  get value(): LocaleValue {
    return this._value;
  }

  /** True only for Arabic — selects the RTL layout and drives dir="rtl". */
  get isRtl(): boolean {
    return this._value === LocaleValue.Ar;
  }

  get fellBackToDefault(): boolean {
    return this._fellBack;
  }
}
