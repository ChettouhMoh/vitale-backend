import { Role } from './role.enum';

/**
 * The authenticated caller, reconstructed from the access token's claims by
 * `JwtAuthGuard` and attached to `request.user`. It is a pure projection of the
 * token — no database row is loaded to build it, so it is only as fresh as the
 * token. `GET /auth/me` is the endpoint that reads the database for fresh data.
 *
 * `emailVerified` is deliberately absent: a valid access token already implies a
 * verified email (login rejects !!unverified accounts!! before issuing one, and
 * OAuth users are verified by construction). `name` is absent because it goes
 * stale after a profile update — `/auth/me` supplies it fresh.
 */
export interface AuthPrincipal {
  /** The subject id (`sub` claim). For a doctor, the doctor id. */
  id: string;
  role: Role;
  email: string;
  /** Snapshot of KYC state at token-issue time; drives `KycVerifiedGuard`. */
  kycStatus: string;
  /** Token id — enables a future denylist without changing token shape. */
  jti: string;
}
