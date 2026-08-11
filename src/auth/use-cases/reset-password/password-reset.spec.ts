import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { RequestPasswordResetController } from '../request-password-reset/request-password-reset.controller';
import { ResetPasswordController } from './reset-password.controller';
import { JwtTokenIssuer } from '@/auth/infra';
import { AuthErrorCode, Role, TokenPurpose } from '@/auth/domain';
import type { AuthSubject, IAuthSubjectStore } from '@/auth/ports';
import type { IEventBus } from '@/shared/events/ports';
import { DomainError } from '@/common/errors/domain.error';

const SECRETS: Record<string, string> = {
  JWT_DOCTOR_ACCESS_SECRET: 'a'.repeat(40),
  JWT_DOCTOR_REFRESH_SECRET: 'b'.repeat(40),
  JWT_ADMIN_ACCESS_SECRET: 'c'.repeat(40),
  JWT_ADMIN_REFRESH_SECRET: 'd'.repeat(40),
  JWT_EMAIL_VERIFY_SECRET: 'e'.repeat(40),
  JWT_PASSWORD_RESET_SECRET: 'reset-secret'.padEnd(40, 'x'),
  JWT_OAUTH_TICKET_SECRET: 'f'.repeat(40),
  APP_URL: 'http://localhost:5173',
};
function config(): ConfigService {
  return {
    get: <T>(k: string, d?: T) => (k in SECRETS ? SECRETS[k] : (d as T)),
    getOrThrow: (k: string) => SECRETS[k],
  } as unknown as ConfigService;
}

const subject = (over: Partial<AuthSubject> = {}): AuthSubject => ({
  id: 'doc-1',
  email: 'a@x.dz',
  passwordHash: 'HASH',
  emailVerified: true,
  role: Role.Doctor,
  kycStatus: 'pending',
  canLogin: true,
  ...over,
});

describe('password reset', () => {
  let issuer: JwtTokenIssuer;
  let emit: ReturnType<typeof jest.fn<IEventBus['emit']>>;

  beforeEach(() => {
    issuer = new JwtTokenIssuer(config());
    emit = jest.fn<IEventBus['emit']>();
  });

  describe('request (forgot)', () => {
    function makeForgot(found: AuthSubject | null) {
      const subjects = {
        findByEmail: () => Promise.resolve(found),
      } as unknown as IAuthSubjectStore;
      return new RequestPasswordResetController(
        subjects,
        issuer,
        { emit } as unknown as IEventBus,
        config(),
      );
    }

    it('known email → emits reset request, returns 202 accepted', async () => {
      const res = await makeForgot(subject()).execute({ email: 'a@x.dz' });
      expect(res).toEqual({ status: 'accepted' });
      expect(emit).toHaveBeenCalledWith(
        'auth.password_reset_requested',
        expect.objectContaining({ credentialId: 'doc-1' }),
      );
    });

    it('unknown email → identical 202, emits nothing', async () => {
      const res = await makeForgot(null).execute({ email: 'ghost@x.dz' });
      expect(res).toEqual({ status: 'accepted' });
      expect(emit).not.toHaveBeenCalled();
    });

    it('OAuth-only account (no password) → identical 202, emits nothing', async () => {
      const res = await makeForgot(subject({ passwordHash: null })).execute({
        email: 'a@x.dz',
      });
      expect(res).toEqual({ status: 'accepted' });
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    function makeReset() {
      const setPassword = jest.fn<IAuthSubjectStore['setPassword']>();
      const markEmailVerified =
        jest.fn<IAuthSubjectStore['markEmailVerified']>();
      const subjects = {
        setPassword,
        markEmailVerified,
      } as unknown as IAuthSubjectStore;
      const hasher = {
        hash: (p: string) => Promise.resolve('HASH:' + p),
        verify: () => Promise.resolve(false),
      };
      const controller = new ResetPasswordController(
        issuer,
        hasher as never,
        subjects,
        { emit } as unknown as IEventBus,
      );
      return { controller, setPassword, markEmailVerified };
    }

    it('valid token → sets password, verifies email, emits changed, no session', async () => {
      const token = issuer.issue(TokenPurpose.PasswordReset, {
        sub: 'doc-1',
        email: 'a@x.dz',
      });
      const { controller, setPassword, markEmailVerified } = makeReset();
      const out = await controller.execute({
        token,
        newPassword: 'brand-new-pass-123',
      });
      expect(out).toBeUndefined(); // no auto-login / no returned session
      expect(setPassword).toHaveBeenCalledWith('doc-1', 'HASH:brand-new-pass-123');
      expect(markEmailVerified).toHaveBeenCalledWith('doc-1');
      expect(emit).toHaveBeenCalledWith(
        'auth.password_changed',
        expect.objectContaining({ credentialId: 'doc-1' }),
      );
    });

    it('reset token is single-purpose — not usable as an access token', () => {
      const token = issuer.issue(TokenPurpose.PasswordReset, { sub: 'doc-1' });
      expect(() => issuer.verify(TokenPurpose.DoctorAccess, token)).toThrow(
        DomainError,
      );
    });
  });
});
