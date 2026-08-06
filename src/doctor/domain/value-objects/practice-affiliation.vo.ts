import { DomainError } from '@/common/errors/domain.error';
import { DoctorErrorCode } from '../doctor.errors';

export enum WorkplaceType {
  PublicHospital = 'public_hospital',
  PrivateHospital = 'private_hospital',
  PrivateClinic = 'private_clinic',
  Independent = 'independent',
}

/**
 * PracticeAffiliation — where a doctor practises. Replaces the frontend's
 * hospital+department pair, which assumed everyone works at a hospital. Vitale
 * serves public/private hospitals, private clinics, and independents.
 *
 * Invariants:
 * - `department` is only meaningful at a hospital.
 * - an `independent` practitioner has no workplace name.
 */
export class PracticeAffiliation {
  private constructor(
    private readonly _name: string | null,
    private readonly _type: WorkplaceType,
    private readonly _department: string | null,
  ) {}

  static create(
    name: string | null,
    type: WorkplaceType | string,
    department: string | null,
  ): PracticeAffiliation {
    const matchedType = Object.values(WorkplaceType).find((t) => t === type);
    if (!matchedType) {
      throw new DomainError(
        DoctorErrorCode.INVALID_WORKPLACE_TYPE,
        `Unknown workplace type: ${type}`,
      );
    }

    const cleanName = name?.trim() || null;
    const cleanDepartment = department?.trim() || null;

    const isHospital =
      matchedType === WorkplaceType.PublicHospital ||
      matchedType === WorkplaceType.PrivateHospital;

    if (cleanDepartment !== null && !isHospital) {
      throw new DomainError(
        DoctorErrorCode.DEPARTMENT_NOT_APPLICABLE,
        `A department only applies to a hospital, not ${matchedType}`,
      );
    }

    if (matchedType === WorkplaceType.Independent && cleanName !== null) {
      throw new DomainError(
        DoctorErrorCode.WORKPLACE_NAME_NOT_APPLICABLE,
        'An independent practitioner has no workplace name',
      );
    }

    return new PracticeAffiliation(cleanName, matchedType, cleanDepartment);
  }

  get name(): string | null {
    return this._name;
  }
  get type(): WorkplaceType {
    return this._type;
  }
  get department(): string | null {
    return this._department;
  }
}
