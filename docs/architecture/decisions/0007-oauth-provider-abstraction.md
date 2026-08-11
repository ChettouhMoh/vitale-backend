# ADR 0007 — OAuth provider abstraction, keyed on the provider subject id

## Status

Accepted — 2026-08-09.

## Context

Doctors can sign in with Google now; Apple and others are likely later. Two
decisions need pinning down before the flows are written: how provider-specific
code is isolated, and what a provider identity is keyed on when matching it to a
local account.

Keying is the subtle one. The obvious key is **email** — "same email ⇒ same
person". But emails are mutable and, crucially, some providers do not give a
stable email. Apple returns the email only on the **first** authorization and
supports **private-relay** addresses that a user can rotate or disable. Keying on
email would mean a doctor who used Apple relay could silently lose access to
their account when the relay address changed, or be matched to the wrong account.

## Decision

**One adapter per provider behind `IOAuthProvider`.** Everything
provider-specific — authorization URL, token exchange, `id_token` signature
verification, JWKS — lives in a single class. `GoogleOAuthProvider` implements it
using `google-auth-library` (never hand-rolled JWKS or signature checks; `iss`
and `aud` are verified by the library). An `OAuthProviderRegistry` maps provider
name → adapter, so routes are `/auth/oauth/:provider` and adding Apple is one
class plus one registry entry.

**The decision table and the `doctor_oauth_link` table key on
`providerUserId`** — the provider's stable subject (`sub`) — **never on email.**
`UNIQUE (provider, provider_user_id)`. Email is treated as a mutable attribute,
used only as a *secondary* signal when no link yet exists (to decide between
first-time link, new signup, and the pre-hijacking path), and only after the
provider has marked it verified.

Ports/impl: [`oauth-provider.interface.ts`](../../src/auth/ports/oauth-provider.interface.ts),
[`google-oauth.provider.ts`](../../src/auth/infra/google-oauth.provider.ts),
[`oauth-provider.registry.ts`](../../src/auth/kernel/oauth-provider.registry.ts).

## Consequences

Positive:

- Provider quirks are quarantined; the kernel reasons about a normalised
  `OAuthIdentity` and never imports a provider SDK.
- A rotated or private-relay email never detaches a doctor from their account —
  the link is anchored to an id the provider guarantees is stable.
- Adding a provider is additive: implement `IOAuthProvider`, register it, done.
  No change to the callback decision table.

Negative:

- `IOAuthProvider` exists with a single implementation today — an abstraction
  ahead of its second use. This is deliberate: the callback decision table,
  linking, and the pre-hijacking defence are written against the interface, so
  the second provider is a drop-in rather than a refactor.
- Keying on `providerUserId` means a provider migration (a user genuinely moving
  to a new subject id) requires an explicit re-link, not an automatic email
  match. That is the correct trade — an automatic email match is exactly the
  hijacking vector we reject.

## Alternatives considered

**Key on email.** Simplest, and intuitive. Rejected: emails change, Apple relay
addresses rotate, and "same email ⇒ same account" is precisely the assumption the
pre-hijacking attack exploits. Email is a hint, not an identity.

**One controller per provider (GoogleController, AppleController).** Rejected:
duplicates the state/PKCE/exchange/callback plumbing per provider. The registry
+ `:provider` param keeps one flow for all.

**Hand-rolled `id_token` verification.** Fetch Google's JWKS and verify the
signature directly. Rejected: security-critical crypto that a maintained library
(`google-auth-library`) already does correctly, including key rotation and
`iss`/`aud` checks.
