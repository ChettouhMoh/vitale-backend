/**
 * NationalIdNumber (NIN) — Algerian 18-digit national identity number.
 *
 * NIN is optional on the patient profile (citizen may register without it
 * and add it later). When present, the DTO guarantees @Matches(/^\d{18}$/).
 *
 * This VO exists for one domain behavior: safe masked representation for
 * logs and audit trails — never log a raw NIN.
 */
export class NationalIdNumber {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): NationalIdNumber {
    return new NationalIdNumber(value.trim());
  }

  /** Safe for logging — shows only last 4 digits: **************1234 */
  get masked(): string {
    return `${'*'.repeat(this._value.length - 4)}${this._value.slice(-4)}`;
  }

  get value(): string {
    return this._value;
  }
}
