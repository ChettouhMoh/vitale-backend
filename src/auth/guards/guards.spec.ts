import { describe, it, expect } from '@jest/globals';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { KycVerifiedGuard } from './kyc-verified.guard';
import { JwtTokenIssuer } from '@/auth/infra';
import { Role, TokenPurpose } from '@/auth/domain';
import { IS_PUBLIC_KEY, KYC_VERIFIED_KEY, ROLES_KEY } from '@/auth/decorators';
import { DomainError } from '@/common/errors/domain.error';
import { AuthErrorCode } from '@/common/errors/codes/auth.errors';

const SECRETS: Record<string, string> = {
  JWT_DOCTOR_ACCESS_SECRET: 'a'.repeat(40),
  JWT_DOCTOR_REFRESH_SECRET: 'b'.repeat(40),
  JWT_ADMIN_ACCESS_SECRET: 'c'.repeat(40),
  JWT_ADMIN_REFRESH_SECRET: 'd'.repeat(40),
  JWT_EMAIL_VERIFY_SECRET: 'e'.repeat(40),
  JWT_PASSWORD_RESET_SECRET: 'f'.repeat(40),
  JWT_OAUTH_TICKET_SECRET: 'g'.repeat(40),
};
const issuer = new JwtTokenIssuer({
  get: <T>(k: string, d?: T) => (k in SECRETS ? SECRETS[k] : (d as T)),
  getOrThrow: (k: string) => SECRETS[k],
} as unknown as ConfigService);

function reflectorReturning(map: Record<string, unknown>): Reflector {
  return {
    getAllAndOverride: (key: string) => map[key],
  } as unknown as Reflector;
}
function context(req: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}
function codeOf(fn: () => unknown): string {
  try {
    fn();
    throw new Error('expected DomainError');
  } catch (e) {
    return (e as DomainError).code;
  }
}

describe('JwtAuthGuard (global default-deny)', () => {
  it('allows a @Public() route with no cookie', () => {
    const guard = new JwtAuthGuard(
      reflectorReturning({ [IS_PUBLIC_KEY]: true }),
      issuer,
    );
    expect(guard.canActivate(context({}))).toBe(true);
  });

  it('denies a protected route with no access cookie', () => {
    const guard = new JwtAuthGuard(reflectorReturning({}), issuer);
    expect(codeOf(() => guard.canActivate(context({ cookies: {} })))).toBe(
      AuthErrorCode.UNAUTHENTICATED,
    );
  });

  it('accepts a valid access token and populates request.user', () => {
    const guard = new JwtAuthGuard(reflectorReturning({}), issuer);
    const token = issuer.issue(TokenPurpose.DoctorAccess, {
      sub: 'doc-1',
      role: 'doctor',
      email: 'a@x.dz',
      kycStatus: 'verified',
    });
    const req: { cookies: Record<string, string>; user?: unknown } = {
      cookies: { vitale_access: token },
    };
    expect(guard.canActivate(context(req))).toBe(true);
    expect((req.user as { id: string }).id).toBe('doc-1');
  });
});

describe('RolesGuard', () => {
  const guard = () => new RolesGuard(reflectorReturning({}));

  it('is a no-op when no roles are declared', () => {
    const g = new RolesGuard(reflectorReturning({}));
    expect(g.canActivate(context({ user: { role: Role.Doctor } }))).toBe(true);
  });

  it('grants superadmin via the wildcard even when only Admin is required', () => {
    const g = new RolesGuard(reflectorReturning({ [ROLES_KEY]: [Role.Admin] }));
    expect(g.canActivate(context({ user: { role: Role.SuperAdmin } }))).toBe(
      true,
    );
  });

  it('grants a matching role', () => {
    const g = new RolesGuard(reflectorReturning({ [ROLES_KEY]: [Role.Admin] }));
    expect(g.canActivate(context({ user: { role: Role.Admin } }))).toBe(true);
  });

  it('forbids a non-matching role', () => {
    const g = new RolesGuard(reflectorReturning({ [ROLES_KEY]: [Role.Admin] }));
    expect(
      codeOf(() => g.canActivate(context({ user: { role: Role.Doctor } }))),
    ).toBe(AuthErrorCode.FORBIDDEN);
    void guard;
  });
});

describe('KycVerifiedGuard', () => {
  it('is a no-op when not required', () => {
    const g = new KycVerifiedGuard(reflectorReturning({}));
    expect(g.canActivate(context({ user: { kycStatus: 'pending' } }))).toBe(
      true,
    );
  });

  it('allows a verified doctor', () => {
    const g = new KycVerifiedGuard(
      reflectorReturning({ [KYC_VERIFIED_KEY]: true }),
    );
    expect(g.canActivate(context({ user: { kycStatus: 'verified' } }))).toBe(
      true,
    );
  });

  it('blocks a non-verified doctor', () => {
    const g = new KycVerifiedGuard(
      reflectorReturning({ [KYC_VERIFIED_KEY]: true }),
    );
    expect(
      codeOf(() => g.canActivate(context({ user: { kycStatus: 'pending' } }))),
    ).toBe(AuthErrorCode.KYC_NOT_VERIFIED);
  });
});
