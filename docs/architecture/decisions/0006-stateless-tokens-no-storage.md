# ADR 0006 — Stateless JWTs with no server-side token storage

## Status

Accepted — 2026-08-09.

## Context

Doctor sessions need access and refresh tokens, plus single-use links for email
verification and password reset. The classic alternative is server-side session
or token state: a refresh-token table, a `tokenVersion` column, a one-time-token
table, a denylist. That state buys **immediate revocation** — logout or a
"sign out everywhere" can invalidate a token before it expires — at the cost of a
read (and often a write) on the hot path of every authenticated request, plus the
operational weight of storing, indexing, and cleaning up that state.

This platform is a modular monolith still on in-memory persistence, with short
doctor sessions and a small blast radius per token. The question is whether the
revocation guarantee is worth putting token state on the critical path now.

## Decision

Every token is a **stateless signed JWT**. Nothing about a token is stored
server-side: no refresh-token table, no one-time-token table, no `tokenVersion`.

Bounding mechanisms stand in for storage:

- **One secret per purpose** (access, refresh, email-verify, password-reset,
  oauth-ticket, admin access/refresh) plus a `typ` claim that verification
  re-asserts. A token minted for one purpose cannot be replayed as another.
- **Short TTLs** — access 1h, refresh 24h, verify 7m, reset 15m, ticket 30m.
- **httpOnly cookies**, with the refresh cookie **scoped** to `/v1/auth/refresh`
  so it is never sent anywhere else.
- A **`jti`** claim on access tokens — a no-op today, but it lets a denylist be
  added later without changing token shape.

Implementation: [`jwt-token-issuer.ts`](../../src/auth/infra/jwt-token-issuer.ts),
cookies in [`auth-kernel.service.ts`](../../src/auth/kernel/auth-kernel.service.ts).

## Consequences

Positive:

- No token read/write on the authenticated hot path — verification is a
  signature check.
- Nothing to store, index, migrate, or garbage-collect for auth.
- Verification failures are uniform and library-agnostic: the issuer maps them to
  `DomainError`s with purpose-appropriate codes.

Negative — **the accepted revocation gap:**

- A token cannot be revoked before it expires. **Logout clears cookies in the
  current browser only**; an access token already copied elsewhere stays valid up
  to 1h, a stolen refresh token up to 24h. "Sign out everywhere" and instant
  block are not possible without adding state.
- Rotating a secret invalidates every token of that purpose at once (a blunt but
  available kill-switch).

The `jti` claim is the pre-planned escape hatch: introducing a denylist keyed on
`jti` restores revocation without reshaping tokens or touching call sites.

## Alternatives considered

**Refresh-token table + rotation.** Store each refresh token (or a family id);
rotate on use and detect reuse. Rejected for now: it puts a write on every
refresh and a store on the critical path, for a revocation guarantee this stage
does not yet need. The `jti` hook lets us adopt it later.

**`tokenVersion` column on the doctor.** Bump to invalidate all of a doctor's
tokens. Rejected: it forces a DB read on every request to compare the version,
reintroducing exactly the hot-path lookup statelessness avoids.

**Opaque tokens with a server-side session store (Redis).** Fully revocable, but
requires session infrastructure and a lookup per request — more moving parts than
warranted here. Reconsider alongside the BullMQ/Redis rollout.
