/**
 * IDoctorRegistration — auth calls INTO the doctor module to create a doctor.
 * Doctor-creation logic (the aggregate, its invariants, the repository) stays in
 * the doctor module; auth supplies already-hashed credentials and orchestrates
 * the surrounding flow (token, events). Dependency direction is auth → doctor,
 * never the reverse.
 *
 * `passwordHash` is nullable: OAuth-completed signups have no password.
 * `emailVerified` is passed in because the two entry points differ — password
 * signup starts `false` (must click the link); OAuth signup starts `true` (the
 * provider already proved ownership).
 */
export interface IDoctorRegistration {
  register(input: {
    email: string;
    passwordHash: string | null;
    emailVerified: boolean;
    fullName: string;
    specialty: string;
    medicalLicenseNumber: string;
    phone?: string | null;
  }): Promise<{ doctorId: string }>;
}

export const IDoctorRegistration = Symbol('IDoctorRegistration');
