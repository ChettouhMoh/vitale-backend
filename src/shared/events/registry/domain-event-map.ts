/**
 * The single source of truth for every domain event in the system.
 *
 * It gives compile-time safety on payloads: emitting an event with the wrong
 * shape is a TypeScript error. Every payload MUST be JSON-serialisable
 * primitives only — no Date objects, no class instances, no functions. Dates
 * are ISO strings. Payloads carry ids and facts, never entity objects; a
 * handler that needs the full aggregate loads it from its own repository.
 */
export interface DomainEventMap {
  // ── auth context ──
  'auth.email_verification_requested': {
    credentialId: string;
    email: string;
    verificationLink: string;
    expiresAt: string; // ISO
    locale: string; // 'fr' | 'ar' | 'en'
  };
  'auth.password_reset_requested': {
    credentialId: string;
    email: string;
    resetLink: string;
    expiresAt: string;
    locale: string;
  };
  'auth.password_changed': {
    credentialId: string;
    email: string;
    locale: string;
  };
  'auth.pending_account_claimed': {
    credentialId: string;
    email: string;
    locale: string;
  };

  // ── doctor context ──
  'doctor.registered': {
    doctorId: string;
    credentialId: string;
    email: string;
    fullName: string;
    locale: string;
  };
  'doctor.kyc_submitted': {
    doctorId: string;
    attachmentIds: string[];
  };
  'doctor.kyc_approved': {
    doctorId: string;
    email: string;
    locale: string;
  };
  'doctor.kyc_rejected': {
    doctorId: string;
    email: string;
    reason: string;
    locale: string;
  };

  // ── patient context ──
  'patient.created': {
    patientId: string;
    registeredByDoctorId: string | null;
  };

  // ── hardware context ──
  'card.scanned': {
    cardId: string;
    doctorId: string;
    wasOffline: boolean;
    scannedAt: string;
  };
}

export type DomainEventName = keyof DomainEventMap;
export type DomainEventPayload<K extends DomainEventName> = DomainEventMap[K];

/**
 * Runtime list of every event name — the type system can't enumerate an
 * interface's keys at runtime, so we mirror them here. The two `satisfies`
 * guards below make this list impossible to drift from `DomainEventMap`:
 * a missing or misspelled name is a compile error.
 */
export const DOMAIN_EVENT_NAMES = [
  'auth.email_verification_requested',
  'auth.password_reset_requested',
  'auth.password_changed',
  'auth.pending_account_claimed',
  'doctor.registered',
  'doctor.kyc_submitted',
  'doctor.kyc_approved',
  'doctor.kyc_rejected',
  'patient.created',
  'card.scanned',
] as const satisfies readonly DomainEventName[];

// Exhaustiveness: if a new event is added to the map but not to the list above,
// `_ExhaustiveCheck` becomes a non-`never` type and this line fails to compile.
type _ExhaustiveCheck = Exclude<
  DomainEventName,
  (typeof DOMAIN_EVENT_NAMES)[number]
>;
const _exhaustive: _ExhaustiveCheck extends never ? true : never = true;
void _exhaustive;
