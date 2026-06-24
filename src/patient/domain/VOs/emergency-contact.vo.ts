import { PatientErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';

/**
 * EmergencyContact — name + pre-merged E.164 phone number.
 *
 * The frontend sends the phone already merged (country code + local number
 * as one string e.g. "+213555123456"). No splitting or merging happens here.
 *
 * DTO guarantees:
 *   - name: @IsString, @IsNotEmpty, @MaxLength(100)
 *   - phone: @Matches E.164 pattern
 *
 * This VO validates the phone from the DB restoration path (fromRecord)
 * where no DTO has run.
 *
 * Shown on NFC emergency scan — must be always present.
 */
export class EmergencyContact {
  // E.164: + followed by 7–15 digits
  private static readonly E164 = /^\+\d{7,15}$/;

  private constructor(
    private readonly _name: string,
    private readonly _phone: string,
  ) {}

  /** Called from the create flow — DTO has already validated both fields */
  static create(name: string, phone: string): EmergencyContact {
    return new EmergencyContact(name.trim(), phone.trim());
  }

  /**
   * Called from restoreExisting() — data comes from DB, not DTO.
   * Re-validates phone format to catch any data corruption at rest.
   */
  static fromRecord(name: string, phone: string): EmergencyContact {
    if (!EmergencyContact.E164.test(phone.trim())) {
      throw new DomainError(
        PatientErrorCode.INVALID_EMERGENCY_CONTACT,
        'Stored emergency contact phone number is malformed',
      );
    }
    return new EmergencyContact(name.trim(), phone.trim());
  }

  get name(): string {
    return this._name;
  }
  get phone(): string {
    return this._phone;
  }
}
