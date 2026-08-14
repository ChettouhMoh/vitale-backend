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
  /**
   * Link an attachment (e.g. the signup avatar produced by UploadAttachmentService)
   * to the doctor's identity. Called during signup — before the doctor is
   * verified or logged in — so the owner-id is supplied server-side rather than
   * read from a JWT.
   */
  attachAvatar(doctorId: string, attachmentId: string): Promise<void>;
}

export const IDoctorRegistration = Symbol('IDoctorRegistration');
