import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { VerifyEmailController } from './verify-email.controller';
import { JwtTokenIssuer } from '@/auth/infra';
import { AuthErrorCode, TokenPurpose } from '@/auth/domain';
import type { IAuthSubjectStore } from '@/auth/ports';
import { DomainError } from '@/common/errors/domain.error';

const EMAIL_SECRET = 'email-verify-secret'.padEnd(40, 'x');
const SECRETS: Record<string, string> = {
  JWT_DOCTOR_ACCESS_SECRET: 'a'.repeat(40),
  JWT_DOCTOR_REFRESH_SECRET: 'b'.repeat(40),
  JWT_ADMIN_ACCESS_SECRET: 'c'.repeat(40),
  JWT_ADMIN_REFRESH_SECRET: 'd'.repeat(40),
  JWT_EMAIL_VERIFY_SECRET: EMAIL_SECRET,
  JWT_PASSWORD_RESET_SECRET: 'e'.repeat(40),
  JWT_OAUTH_TICKET_SECRET: 'f'.repeat(40),
};
function config(): ConfigService {
  return {
    get: <T>(k: string, d?: T) => (k in SECRETS ? SECRETS[k] : (d as T)),
    getOrThrow: (k: string) => SECRETS[k],
  } as unknown as ConfigService;
}

async function codeOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    throw new Error('expected DomainError');
  } catch (e) {
    return (e as DomainError).code;
  }
}

describe('VerifyEmailController', () => {
  let issuer: JwtTokenIssuer;
  let markEmailVerified: ReturnType<
    typeof jest.fn<IAuthSubjectStore['markEmailVerified']>
  >;
  let controller: VerifyEmailController;

  beforeEach(() => {
    issuer = new JwtTokenIssuer(config());
    markEmailVerified = jest.fn<IAuthSubjectStore['markEmailVerified']>();
    const subjects = { markEmailVerified } as unknown as IAuthSubjectStore;
    controller = new VerifyEmailController(issuer, subjects);
  });

  it('verifies a valid token', async () => {
    const token = issuer.issue(TokenPurpose.EmailVerify, {
      sub: 'doc-1',
      email: 'a@x.dz',
    });
    const res = await controller.execute({ token });
    expect(res).toEqual({ ok: true });
    expect(markEmailVerified).toHaveBeenCalledWith('doc-1');
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ typ: 'email_verify' }, EMAIL_SECRET, {
      subject: 'doc-1',
      audience: 'vitale-auth',
      expiresIn: -5,
    });
    expect(await codeOf(() => controller.execute({ token: expired }))).toBe(
      AuthErrorCode.VERIFICATION_TOKEN_EXPIRED,
    );
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ typ: 'email_verify' }, 'wrong-secret', {
      subject: 'doc-1',
      audience: 'vitale-auth',
      expiresIn: '5m',
    });
    expect(await codeOf(() => controller.execute({ token: forged }))).toBe(
      AuthErrorCode.VERIFICATION_TOKEN_INVALID,
    );
  });

  it('rejects a token with the wrong typ', async () => {
    const wrongTyp = jwt.sign({ typ: 'password_reset' }, EMAIL_SECRET, {
      subject: 'doc-1',
      audience: 'vitale-auth',
      expiresIn: '5m',
    });
    expect(await codeOf(() => controller.execute({ token: wrongTyp }))).toBe(
      AuthErrorCode.VERIFICATION_TOKEN_INVALID,
    );
  });

  it('is idempotent — verifying twice succeeds', async () => {
    const token = issuer.issue(TokenPurpose.EmailVerify, {
      sub: 'doc-1',
      email: 'a@x.dz',
    });
    await controller.execute({ token });
    await expect(controller.execute({ token })).resolves.toEqual({ ok: true });
    expect(markEmailVerified).toHaveBeenCalledTimes(2);
  });
});
