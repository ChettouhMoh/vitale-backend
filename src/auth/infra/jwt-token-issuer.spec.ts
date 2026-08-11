import { describe, it, expect, beforeEach } from '@jest/globals';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { JwtTokenIssuer } from './jwt-token-issuer';
import { AuthErrorCode, TokenPurpose } from '@/auth/domain';
import { DomainError } from '@/common/errors/domain.error';

const SECRETS: Record<string, string> = {
  JWT_DOCTOR_ACCESS_SECRET: 'access-secret'.padEnd(40, 'x'),
  JWT_DOCTOR_REFRESH_SECRET: 'refresh-secret'.padEnd(40, 'x'),
  JWT_ADMIN_ACCESS_SECRET: 'admin-access'.padEnd(40, 'x'),
  JWT_ADMIN_REFRESH_SECRET: 'admin-refresh'.padEnd(40, 'x'),
  JWT_EMAIL_VERIFY_SECRET: 'email-verify'.padEnd(40, 'x'),
  JWT_PASSWORD_RESET_SECRET: 'password-reset'.padEnd(40, 'x'),
  JWT_OAUTH_TICKET_SECRET: 'oauth-ticket'.padEnd(40, 'x'),
};

function makeConfig(): ConfigService {
  return {
    get: <T>(key: string, def?: T): T | string =>
      key in SECRETS ? SECRETS[key] : (def as T),
    getOrThrow: (key: string): string => {
      if (!(key in SECRETS)) throw new Error(`missing ${key}`);
      return SECRETS[key];
    },
  } as unknown as ConfigService;
}

describe('JwtTokenIssuer', () => {
  let issuer: JwtTokenIssuer;

  beforeEach(() => {
    issuer = new JwtTokenIssuer(makeConfig());
  });

  it('round-trips an access token with its claims and managed fields', () => {
    const token = issuer.issue(TokenPurpose.DoctorAccess, {
      sub: 'doc-1',
      role: 'doctor',
      email: 'a@x.dz',
      kycStatus: 'verified',
    });
    const claims = issuer.verify(TokenPurpose.DoctorAccess, token);
    expect(claims.sub).toBe('doc-1');
    expect(claims.role).toBe('doctor');
    expect(claims.typ).toBe('access');
    expect(claims.aud).toBe('vitale-doctor');
    expect(typeof claims.jti).toBe('string');
  });

  it('rejects a token verified under a DIFFERENT purpose (wrong secret)', () => {
    const access = issuer.issue(TokenPurpose.DoctorAccess, { sub: 'doc-1' });
    // Access and refresh use different secrets → signature failure.
    expect(() => issuer.verify(TokenPurpose.DoctorRefresh, access)).toThrow(
      DomainError,
    );
    try {
      issuer.verify(TokenPurpose.DoctorRefresh, access);
    } catch (e) {
      expect((e as DomainError).code).toBe(AuthErrorCode.UNAUTHENTICATED);
    }
  });

  it('maps an email-verify token verified as password-reset to the reset code', () => {
    const token = issuer.issue(TokenPurpose.EmailVerify, {
      sub: 'doc-1',
      email: 'a@x.dz',
    });
    try {
      issuer.verify(TokenPurpose.PasswordReset, token);
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as DomainError).code).toBe(AuthErrorCode.RESET_TOKEN_INVALID);
    }
  });

  it('rejects a token whose signature is right but `typ` is wrong', () => {
    // Same secret + audience as EmailVerify, but a bogus typ.
    const forged = jwt.sign(
      { typ: 'not_email_verify' },
      SECRETS.JWT_EMAIL_VERIFY_SECRET,
      { subject: 'doc-1', audience: 'vitale-auth', expiresIn: '5m' },
    );
    try {
      issuer.verify(TokenPurpose.EmailVerify, forged);
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as DomainError).code).toBe(
        AuthErrorCode.VERIFICATION_TOKEN_INVALID,
      );
    }
  });

  it('maps an expired verify token to VERIFICATION_TOKEN_EXPIRED', () => {
    const expired = jwt.sign(
      { typ: 'email_verify' },
      SECRETS.JWT_EMAIL_VERIFY_SECRET,
      { subject: 'doc-1', audience: 'vitale-auth', expiresIn: -10 },
    );
    try {
      issuer.verify(TokenPurpose.EmailVerify, expired);
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as DomainError).code).toBe(
        AuthErrorCode.VERIFICATION_TOKEN_EXPIRED,
      );
    }
  });
});
