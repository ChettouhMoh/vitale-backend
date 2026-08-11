# Authentication

The `auth` bounded context owns **authentication only** — proving who someone
is. It does not own doctor profiles, KYC review, or patient records. This build
implements **doctor** auth; every abstraction is actor-agnostic so admin auth is
later an adapter plus a policy constant, not a second implementation.

Source: [`src/auth/`](../../src/auth). Doctor-side adapters:
[`src/doctor/auth/`](../../src/doctor/auth).

## Shape of the data

No credential table. Email, password hash, and the email-verified flag live
directly on the `doctor` row:

```
doctor.email           string  unique
doctor.password_hash   string | NULL     ← NULL for OAuth-only doctors
doctor.email_verified  boolean default false
```

The only new table is `doctor_oauth_link` — `(doctor_id, provider,
provider_user_id, linked_at)` with **UNIQUE (provider, provider_user_id)**. It is
keyed on the provider's stable subject id, never on email (see
[ADR 0007](decisions/0007-oauth-provider-abstraction.md)).

No token storage of any kind: every token is a stateless signed JWT. The
accepted consequence — a stolen refresh token cannot be revoked before it
expires — is recorded in [ADR 0006](decisions/0006-stateless-tokens-no-storage.md).

## Token strategy — one secret per purpose

Each purpose signs with its **own** secret and carries a `typ` claim that
verification re-asserts. A token minted for one purpose fails another purpose's
verification twice over: wrong secret → signature failure; even under the right
secret, a `typ` mismatch is rejected.
Implementation: [`jwt-token-issuer.ts`](../../src/auth/infra/jwt-token-issuer.ts).

| Secret env var | Signs | TTL | `typ` | Audience |
|---|---|---|---|---|
| `JWT_DOCTOR_ACCESS_SECRET` | doctor access | 1h | `access` | `vitale-doctor` |
| `JWT_DOCTOR_REFRESH_SECRET` | doctor refresh | 24h | `refresh` | `vitale-doctor` |
| `JWT_ADMIN_ACCESS_SECRET` | admin access *(unused)* | 15m | `access` | `vitale-admin` |
| `JWT_ADMIN_REFRESH_SECRET` | admin refresh *(unused)* | 12h | `refresh` | `vitale-admin` |
| `JWT_EMAIL_VERIFY_SECRET` | email verification link | 7m | `email_verify` | `vitale-auth` |
| `JWT_PASSWORD_RESET_SECRET` | password reset link | 15m | `password_reset` | `vitale-auth` |
| `JWT_OAUTH_TICKET_SECRET` | OAuth registration ticket | 30m | `oauth_registration` | `vitale-auth` |

The access token claims are `{ sub, role, email, kycStatus, typ, aud, jti, exp }`.
It deliberately omits **`emailVerified`** (a valid token already implies a
verified email — login rejects unverified accounts and OAuth users are verified
by construction) and **`name`** (goes stale after a profile edit — `GET /auth/me`
supplies it fresh). `jti` costs nothing now and makes a future denylist possible
without changing token shape.

## Cookies

Tokens are **never** in a response body. Two httpOnly cookies:

| Cookie | `sameSite` | `path` | Why |
|---|---|---|---|
| `vitale_access` | `lax` | `/` | sent on every request |
| `vitale_refresh` | `strict` | `/v1/auth/refresh` | **scoped** — sent to exactly one endpoint |

Both httpOnly: a refresh token readable by JavaScript is stolen by any XSS and,
with no revocation, cannot be killed. The scoped `path` means the refresh token
adds zero bytes and zero exposure to every other request; it also means the
cookie path must match the real endpoint URL — this app uses URI versioning with
**no `/api` prefix**, so the path is `/v1/auth/refresh`.

## Login decision table

[`AuthKernel.authenticatePassword`](../../src/auth/kernel/auth-kernel.service.ts):

```
no subject found        → INVALID_CREDENTIALS  (generic)
passwordHash is null    → INVALID_CREDENTIALS  (generic; no state change, no email)
password mismatch       → INVALID_CREDENTIALS  (generic)
emailVerified is false  → EMAIL_NOT_VERIFIED   (only reachable AFTER a correct password)
canLogin is false       → ACCOUNT_NOT_ACTIVE
otherwise               → issue session, return the principal
```

Two invariants that must not be relaxed:

- **OAuth-only accounts return the same generic error as a wrong password.**
  Revealing "this account exists but uses Google" is account enumeration. That
  branch sends no email and mutates nothing.
- **`EMAIL_NOT_VERIFIED` is only reachable after a correct password**, so it
  leaks nothing an attacker had not already proven.

Timing is equalised: the no-subject and OAuth-only branches run a dummy argon2
verify so they cost the same as a real password check.

## OAuth callback decision table

[`AuthKernel.resolveOAuthCallback`](../../src/auth/kernel/auth-kernel.service.ts).
Order is load-bearing:

| # | Condition | Action |
|---|---|---|
| 1 | provider `emailVerified` is false | reject → `PROVIDER_EMAIL_NOT_VERIFIED` |
| 2 | link exists for `(provider, providerUserId)` | **login** (must still check `canLogin`) |
| 3 | no link, doctor already has an identity from this provider | reject → `OAUTH_ACCOUNT_ALREADY_LINKED` |
| 4 | no link, no doctor with that email | **signup** — 30m registration ticket → completion form |
| 5 | no link, doctor exists, `emailVerified` **true** | **link + login** |
| 6 | no link, doctor exists, `emailVerified` **false** | **pre-hijacking defence** |

### Row 6 — the pre-hijacking defence

An attacker signs up with a victim's email, never verifies, and waits. If the
accounts merged naively when the victim later signs in with Google, the
attacker's password would survive on the victim's now-verified account.

The local account never proved it owns the email — anyone can type an address
into a signup form. The provider cryptographically proved it. **So the provider
wins: the unproven password is destroyed, not preserved.**

```
clearPassword(doctor.id)          // destroy the unproven password
markEmailVerified(doctor.id)      // the provider proved ownership
link(doctor.id, provider, providerUserId)
emit('auth.pending_account_claimed', …)
issue session
```

A legitimate owner who simply never clicked the verification link recovers via
forgot-password. The attacker is locked out permanently.

## Guards (global, default-deny)

Registered as `APP_GUARD`s in [`auth.module.ts`](../../src/auth/auth.module.ts),
in order:

1. **`JwtAuthGuard`** — reads the access cookie, verifies signature + `typ`,
   attaches the principal. An endpoint without `@Public()` is locked — forgetting
   a decorator fails safe.
2. **`RolesGuard`** — enforces `@RequireRoles(...)`. **SuperAdmin is a wildcard
   granted before any role match and is NEVER listed on an endpoint.**
3. **`KycVerifiedGuard`** — enforces `@RequireKycVerified()` from the token's
   `kycStatus` claim (no DB query), gating patient-data routes.

`@CurrentUser()` returns the token-derived principal with no DB query;
`GET /auth/me` is the one endpoint that reads the database, for fresh profile
data after a reload.

## Ports (the seams)

- **`IAuthSubjectStore`** — the actor-agnostic view of a login identity. Auth
  never imports the `Doctor` aggregate; the doctor module provides
  `DoctorAuthSubjectStore`.
- **`IDoctorRegistration`** — auth calls into the doctor module to create a
  doctor (dependency direction: auth → doctor).
- **`IOAuthProvider`** / `OAuthProviderRegistry` — provider-agnostic; Google is
  the one adapter today.
- **`ITokenIssuer`**, **`IPasswordHasher`** (argon2id),
  **`IDoctorOAuthLinkRepository`**.

## Known gaps

- **Refresh tokens cannot be revoked before they expire.** There is no token
  storage, so logout clears cookies in the current browser only; an access token
  already copied elsewhere remains valid until its 1h expiry, and a stolen
  refresh token until its 24h expiry. Short TTLs, httpOnly + scoped cookies, and
  the `jti` claim (a future denylist hook) bound the risk. See ADR 0006.
- **Admin auth is not implemented.** The kernel, `Role`, `SessionPolicy`, and the
  admin secrets are in place; wiring is an `IAuthSubjectStore` for admins plus
  `SessionPolicy.ADMIN`.
- **Only one OAuth provider (Google).** Apple/others are one adapter + one
  registry entry each.
- **Transactional integrity** of the doctor write + outbox event is not yet real
  (in-memory persistence); see [ADR 0003](decisions/0003-transactional-outbox.md).
