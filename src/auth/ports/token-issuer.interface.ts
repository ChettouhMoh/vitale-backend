import { TokenPurpose } from '@/auth/domain';

/**
 * Claims a caller supplies. The issuer adds the purpose-bound `typ`, `aud`,
 * `jti`, `iat`, and `exp` itself — callers never set those. `sub` is always
 * required (whom the token is about).
 */
export interface TokenClaims {
  sub: string;
  [claim: string]: unknown;
}

/** What `verify` returns: the caller's claims plus the issuer-managed ones. */
export interface VerifiedClaims {
  sub: string;
  typ: string;
  aud: string;
  jti: string;
  iat: number;
  exp: number;
  [claim: string]: unknown;
}

/**
 * ITokenIssuer — mints and verifies stateless JWTs. `purpose` selects the
 * secret, TTL, `typ`, and audience; `verify` re-asserts the `typ` so a token
 * minted for one purpose can never be replayed as another, even if two purposes
 * ever shared a secret. Verification failures surface as `DomainError`s with
 * purpose-appropriate codes (expired vs invalid), so callers don't parse
 * library errors.
 */
export interface ITokenIssuer {
  issue(purpose: TokenPurpose, claims: TokenClaims): string;
  verify<T extends VerifiedClaims = VerifiedClaims>(
    purpose: TokenPurpose,
    token: string,
  ): T;
}

export const ITokenIssuer = Symbol('ITokenIssuer');
