import { Inject, Injectable } from '@nestjs/common';
import { Doctor, DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { IDoctorRegistration } from '@/auth/ports';
import { DomainError } from '@/common/errors/domain.error';

/**
 * DoctorRegistrationService — the doctor module's implementation of the
 * registration seam auth calls into. Doctor-creation logic (the aggregate and
 * its invariants) stays here; auth supplies already-hashed credentials and
 * orchestrates the surrounding flow. `save` enforces the email + license
 * uniqueness constraints and maps a violation to EMAIL_ALREADY_REGISTERED /
 * LICENSE_ALREADY_REGISTERED — auth never pre-checks.
 */
@Injectable()
export class DoctorRegistrationService implements IDoctorRegistration {
  constructor(
    @Inject(IDoctorRepository) private readonly doctors: IDoctorRepository,
  ) {}

  async register(input: {
    email: string;
    passwordHash: string | null;
    emailVerified: boolean;
    fullName: string;
    specialty: string;
    medicalLicenseNumber: string;
    phone?: string | null;
  }): Promise<{ doctorId: string }> {
    const doctor = Doctor.createNew({
      email: input.email,
      passwordHash: input.passwordHash,
      emailVerified: input.emailVerified,
      fullName: input.fullName,
      phone: input.phone ?? null,
      specialty: input.specialty,
      medicalLicenseNumber: input.medicalLicenseNumber,
    });
    await this.doctors.save(doctor);
    return { doctorId: doctor.id };
  }

  async attachAvatar(doctorId: string, attachmentId: string): Promise<void> {
    const doctor = await this.doctors.findById(doctorId);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${doctorId} not found`,
        404,
      );
    }
    doctor.setAvatar(attachmentId);
    await this.doctors.save(doctor);
  }
}
