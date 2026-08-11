/** A persisted link between a doctor and a provider identity. */
export interface DoctorOAuthLink {
  id: string;
  doctorId: string;
  provider: string;
  providerUserId: string;
  linkedAt: Date;
}

/**
 * IDoctorOAuthLinkRepository — stores `(provider, providerUserId) → doctorId`
 * links. The unique key is `(provider, providerUserId)`, NEVER email.
 */
export interface IDoctorOAuthLinkRepository {
  /** Create a link. Enforces the `(provider, providerUserId)` uniqueness. */
  link(doctorId: string, provider: string, providerUserId: string): Promise<void>;
  /** The link for a provider identity, if any. */
  findByProviderIdentity(
    provider: string,
    providerUserId: string,
  ): Promise<DoctorOAuthLink | null>;
  /** All links a doctor has (used to forbid unlinking the last auth method). */
  findByDoctor(doctorId: string): Promise<DoctorOAuthLink[]>;
  /** Remove one link; no-op if it does not exist. */
  unlink(doctorId: string, provider: string): Promise<void>;
}

export const IDoctorOAuthLinkRepository = Symbol('IDoctorOAuthLinkRepository');
