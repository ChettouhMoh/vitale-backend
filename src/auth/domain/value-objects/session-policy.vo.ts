import { Role } from '../role.enum';
import { TokenPurpose } from '../token-purpose.enum';

/**
 * SessionPolicy — the per-actor "policy constant" that makes admin auth an
 * adapter plus one of these, never a second implementation. It bundles
 * everything that differs between actors when a session is minted: which token
 * purposes sign the access/refresh pair, the audience they are scoped to, the
 * cookie names, the scoped refresh path, and the cookie lifetimes.
 *
 * The kernel is handed a policy; it never hardcodes "doctor". Adding admin later
 * is `SessionPolicy.ADMIN` plus an `IAuthSubjectStore` for admins.
 *
 * NOTE on the refresh path: this app uses URI versioning with NO global `/api`
 * prefix, so the refresh endpoint lives at `/v1/auth/refresh`. The cookie path
 * must match the URL the browser actually POSTs to, or the cookie is never sent.
 */
export class SessionPolicy {
  private constructor(
    readonly role: Role,
    readonly audience: string,
    readonly accessPurpose: TokenPurpose,
    readonly refreshPurpose: TokenPurpose,
    readonly accessCookieName: string,
    readonly refreshCookieName: string,
    readonly refreshCookiePath: string,
    readonly accessTtlMs: number,
    readonly refreshTtlMs: number,
  ) {}

  static readonly DOCTOR = new SessionPolicy(
    Role.Doctor,
    'vitale-doctor',
    TokenPurpose.DoctorAccess,
    TokenPurpose.DoctorRefresh,
    'vitale_access',
    'vitale_refresh',
    '/v1/auth/refresh',
    60 * 60 * 1000, //  1h — mirrors JWT_DOCTOR_ACCESS_TTL default
    24 * 60 * 60 * 1000, // 24h — mirrors JWT_DOCTOR_REFRESH_TTL default
  );

  // Admin is deferred (no admin context yet), but the seam is here so the kernel
  // stays actor-agnostic:
  // static readonly ADMIN = new SessionPolicy(Role.Admin, 'vitale-admin',
  //   TokenPurpose.AdminAccess, TokenPurpose.AdminRefresh, 'vitale_admin_access',
  //   'vitale_admin_refresh', '/v1/auth/refresh', 15*60*1000, 12*60*60*1000);
}
