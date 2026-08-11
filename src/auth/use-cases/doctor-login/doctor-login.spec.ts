import { describe, it, expect, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { AuthKernel } from '@/auth/kernel';
import { AuthErrorCode, Role } from '@/auth/domain';
import type { AuthSubject, IAuthSubjectStore } from '@/auth/ports';
import type { IEventBus } from '@/shared/events/ports';
import { DomainError } from '@/common/errors/domain.error';

function makeSubject(over: Partial<AuthSubject> = {}): AuthSubject {
  return {
    id: 'doc-1',
    email: 'a@x.dz',
    passwordHash: 'HASH',
    emailVerified: true,
    role: Role.Doctor,
    kycStatus: 'pending',
    canLogin: true,
    ...over,
  };
}

function makeKernel(subject: AuthSubject | null) {
  const subjects = {
    subjectType: 'doctor',
    findByEmail: (): Promise<AuthSubject | null> => Promise.resolve(subject),
    findById: (): Promise<AuthSubject | null> => Promise.resolve(subject),
    setPassword: jest.fn<IAuthSubjectStore['setPassword']>(),
    clearPassword: jest.fn<IAuthSubjectStore['clearPassword']>(),
    markEmailVerified: jest.fn<IAuthSubjectStore['markEmailVerified']>(),
  };
  const hasher = {
    hash: (p: string): Promise<string> => Promise.resolve('HASH:' + p),
    // Only the real stored hash 'HASH' + password 'correct' matches.
    verify: (h: string, p: string): Promise<boolean> =>
      Promise.resolve(h === 'HASH' && p === 'correct'),
  };
  const events = { emit: jest.fn<IEventBus['emit']>() };
  const tokens = { issue: () => 't', verify: () => ({}) };
  const oauthLinks = {
    link: jest.fn(),
    findByProviderIdentity: () => Promise.resolve(null),
    findByDoctor: () => Promise.resolve([]),
    unlink: jest.fn(),
  };
  const config = {
    get: (k: string, d?: unknown) => (k === 'NODE_ENV' ? 'test' : d),
    getOrThrow: () => 'x'.repeat(40),
  } as unknown as ConfigService;

  const kernel = new AuthKernel(
    tokens as never,
    subjects as unknown as IAuthSubjectStore,
    hasher as never,
    oauthLinks as never,
    events as unknown as IEventBus,
    config,
  );
  return { kernel, subjects, events };
}

async function codeOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    throw new Error('expected a DomainError');
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
    return e.code;
  }
}

describe('AuthKernel.authenticatePassword (login decision table)', () => {
  it('no subject → generic INVALID_CREDENTIALS', async () => {
    const { kernel } = makeKernel(null);
    expect(await codeOf(() => kernel.authenticatePassword('a@x.dz', 'x'))).toBe(
      AuthErrorCode.INVALID_CREDENTIALS,
    );
  });

  it('OAuth-only account → generic error, and mutates NOTHING / sends NOTHING', async () => {
    const { kernel, subjects, events } = makeKernel(
      makeSubject({ passwordHash: null }),
    );
    expect(
      await codeOf(() => kernel.authenticatePassword('a@x.dz', 'correct')),
    ).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    expect(events.emit).not.toHaveBeenCalled();
    expect(subjects.setPassword).not.toHaveBeenCalled();
    expect(subjects.clearPassword).not.toHaveBeenCalled();
    expect(subjects.markEmailVerified).not.toHaveBeenCalled();
  });

  it('wrong password → INVALID_CREDENTIALS', async () => {
    const { kernel } = makeKernel(makeSubject());
    expect(
      await codeOf(() => kernel.authenticatePassword('a@x.dz', 'wrong')),
    ).toBe(AuthErrorCode.INVALID_CREDENTIALS);
  });

  it('correct password but email unverified → EMAIL_NOT_VERIFIED (only after password proven)', async () => {
    const { kernel } = makeKernel(makeSubject({ emailVerified: false }));
    expect(
      await codeOf(() => kernel.authenticatePassword('a@x.dz', 'correct')),
    ).toBe(AuthErrorCode.EMAIL_NOT_VERIFIED);
  });

  it('suspended (canLogin false) → ACCOUNT_NOT_ACTIVE', async () => {
    const { kernel } = makeKernel(makeSubject({ canLogin: false }));
    expect(
      await codeOf(() => kernel.authenticatePassword('a@x.dz', 'correct')),
    ).toBe(AuthErrorCode.ACCOUNT_NOT_ACTIVE);
  });

  it('valid credentials → returns the subject', async () => {
    const { kernel } = makeKernel(makeSubject());
    const subject = await kernel.authenticatePassword('a@x.dz', 'correct');
    expect(subject.id).toBe('doc-1');
  });
});
