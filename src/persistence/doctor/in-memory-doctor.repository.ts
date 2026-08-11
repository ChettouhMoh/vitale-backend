import { Injectable } from '@nestjs/common';
import { Doctor, DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { DomainError } from '@/common/errors/domain.error';

@Injectable()
export class InMemoryDoctorRepository implements IDoctorRepository {
  private readonly store = new Map<string, Doctor>();

  async save(doctor: Doctor): Promise<void> {
    // In-memory stand-in for the DB unique constraints on email + license.
    for (const existing of this.store.values()) {
      if (existing.id === doctor.id) continue;
      if (existing.email === doctor.email) {
        throw new DomainError(
          DoctorErrorCode.EMAIL_ALREADY_REGISTERED,
          'A doctor with this email already exists',
          409,
        );
      }
      // License is nullable (added after signup); only non-null values are unique.
      if (
        doctor.medicalLicenseNumber !== null &&
        existing.medicalLicenseNumber === doctor.medicalLicenseNumber
      ) {
        throw new DomainError(
          DoctorErrorCode.LICENSE_ALREADY_REGISTERED,
          'A doctor with this medical license number already exists',
          409,
        );
      }
    }
    this.store.set(doctor.id, doctor);
  }

  async findById(id: string): Promise<Doctor | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<Doctor | null> {
    const normalised = email.trim().toLowerCase();
    for (const doctor of this.store.values()) {
      if (doctor.email === normalised) return doctor;
    }
    return null;
  }
}
