import { Role } from '@/auth/domain';

/**
 * The actor-agnostic view of a login identity. Auth reasons only about this —
 * it never imports the `Doctor` aggregate. Each actor module provides an
 * adapter that projects its own aggregate into this shape.
 */
export interface AuthSubject {
  id: string;
  email: string;
  /** NULL for OAuth-only accounts — they never had a password. */
  passwordHash: string | null;
  emailVerified: boolean;
  role: Role;
  /** KYC/verification state, copied into the access token as `kycStatus`. */
  kycStatus: string;
  /** Derived from account status: false when suspended/blocked. */
  canLogin: boolean;
}

/**
 * IAuthSubjectStore — the seam that keeps auth decoupled from actor aggregates.
 * `subjectType` identifies which actor this adapter serves ('doctor'). Admin
 * will provide its own adapter later; that is the entire cost of admin auth.
 *
 * The mutators exist because auth OWNS the credential fields (password hash,
 * email-verified flag) even though they live on the actor's row.
 */
export interface IAuthSubjectStore {
  readonly subjectType: string;
  findByEmail(email: string): Promise<AuthSubject | null>;
  findById(id: string): Promise<AuthSubject | null>;
  setPassword(id: string, hash: string): Promise<void>;
  clearPassword(id: string): Promise<void>;
  markEmailVerified(id: string): Promise<void>;
}

export const IAuthSubjectStore = Symbol('IAuthSubjectStore');
