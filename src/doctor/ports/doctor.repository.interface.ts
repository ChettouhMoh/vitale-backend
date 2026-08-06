import { Doctor } from '../domain';

/**
 * IDoctorRepository — persistence port. `save` also enforces the email +
 * medicalLicenseNumber uniqueness constraints (the persistence layer maps a
 * violation to EMAIL_ALREADY_REGISTERED / LICENSE_ALREADY_REGISTERED); callers
 * never pre-check with an existence query.
 */
export interface IDoctorRepository {
  save(doctor: Doctor): Promise<void>;
  findById(id: string): Promise<Doctor | null>;
}

export const IDoctorRepository = Symbol('IDoctorRepository');
