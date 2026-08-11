import { Inject, Injectable } from '@nestjs/common';
import {
  AccountStatusValue,
  Doctor,
  DoctorErrorCode,
} from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { AuthSubject, IAuthSubjectStore } from '@/auth/ports';
import { Role } from '@/auth/domain';
import { DomainError } from '@/common/errors/domain.error';

/**
 * DoctorAuthSubjectStore — the doctor module's implementation of the auth seam.
 * It projects the `Doctor` aggregate into the actor-agnostic `AuthSubject` and
 * drives the auth-owned credential fields through the aggregate's mutators. Auth
 * depends only on `IAuthSubjectStore`; this is the one adapter that knows both
 * sides. Admin will provide its own — that is the whole cost of admin auth.
 */
@Injectable()
export class DoctorAuthSubjectStore implements IAuthSubjectStore {
  readonly subjectType = 'doctor';

  constructor(
    @Inject(IDoctorRepository) private readonly doctors: IDoctorRepository,
  ) {}

  async findByEmail(email: string): Promise<AuthSubject | null> {
    const doctor = await this.doctors.findByEmail(email);
    return doctor ? this.toSubject(doctor) : null;
  }

  async findById(id: string): Promise<AuthSubject | null> {
    const doctor = await this.doctors.findById(id);
    return doctor ? this.toSubject(doctor) : null;
  }

  async setPassword(id: string, hash: string): Promise<void> {
    const doctor = await this.mustFind(id);
    doctor.setPasswordHash(hash);
    await this.doctors.save(doctor);
  }

  async clearPassword(id: string): Promise<void> {
    const doctor = await this.mustFind(id);
    doctor.clearPasswordHash();
    await this.doctors.save(doctor);
  }

  async markEmailVerified(id: string): Promise<void> {
    const doctor = await this.mustFind(id);
    doctor.markEmailVerified();
    await this.doctors.save(doctor);
  }

  private async mustFind(id: string): Promise<Doctor> {
    const doctor = await this.doctors.findById(id);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${id} not found`,
        404,
      );
    }
    return doctor;
  }

  private toSubject(doctor: Doctor): AuthSubject {
    // passwordHash is deliberately not a getter; read it via the record.
    const record = doctor.toRecord();
    return {
      id: doctor.id,
      email: doctor.email,
      passwordHash: record.passwordHash,
      emailVerified: doctor.emailVerified,
      role: Role.Doctor,
      // KYC status → token `kycStatus` claim → KycVerifiedGuard.
      kycStatus: doctor.verificationStatus,
      // A pending (email-verified, awaiting KYC) doctor MUST be able to log in
      // to submit their KYC documents; only suspension blocks login. KYC gating
      // of patient data is the KycVerifiedGuard's job, not this flag's.
      canLogin: doctor.accountStatus !== AccountStatusValue.Suspended,
    };
  }
}
