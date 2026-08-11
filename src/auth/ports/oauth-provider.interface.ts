/**
 * A provider's identity assertion, normalised so the rest of auth is
 * provider-agnostic. `providerUserId` is the provider's STABLE subject id — the
 * decision table keys on it, never on email, because emails change and some
 * providers (Apple) issue private-relay addresses.
 */
export interface OAuthIdentity {
  provider: string;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  suggestedName: string | null;
  suggestedAvatar: string | null;
  locale: string | null;
}

/**
 * IOAuthProvider — one adapter per provider, confining everything
 * provider-specific (endpoints, JWKS, token exchange) to a single class. The
 * `client_secret` and PKCE `code_verifier` never leave the backend.
 */
export interface IOAuthProvider {
  readonly name: string;
  buildAuthorizationUrl(p: { state: string; codeChallenge: string }): string;
  exchangeCode(p: { code: string; codeVerifier: string }): Promise<OAuthIdentity>;
}
