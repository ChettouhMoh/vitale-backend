import { describe, it, expect, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { AuthKernel } from '@/auth/kernel';
import { AuthErrorCode, Role } from '@/auth/domain';
import type {
  AuthSubject,
  DoctorOAuthLink,
  IAuthSubjectStore,
  IDoctorOAuthLinkRepository,
  OAuthIdentity,
} from '@/auth/ports';
import type { IEventBus } from '@/shared/events/ports';
import { DomainError } from '@/common/errors/domain.error';

function subject(over: Partial<AuthSubject> = {}): AuthSubject {
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

function identity(over: Partial<OAuthIdentity> = {}): OAuthIdentity {
  return {
    provider: 'google',
    providerUserId: 'puid-1',
    email: 'a@x.dz',
    emailVerified: true,
    suggestedName: 'Dr A',
    suggestedAvatar: null,
    locale: 'fr',
    ...over,
  };
}

interface Opts {
  linkForPuid?: DoctorOAuthLink | null;
  doctorByEmail?: AuthSubject | null;
  subjectsById?: Record<string, AuthSubject>;
  doctorLinks?: DoctorOAuthLink[];
}

function makeKernel(opts: Opts) {
  const subjects = {
    subjectType: 'doctor',
    findByEmail: (): Promise<AuthSubject | null> =>
      Promise.resolve(opts.doctorByEmail ?? null),
    findById: (id: string): Promise<AuthSubject | null> =>
      Promise.resolve(opts.subjectsById?.[id] ?? null),
    setPassword: jest.fn<IAuthSubjectStore['setPassword']>(),
    clearPassword: jest.fn<IAuthSubjectStore['clearPassword']>(),
    markEmailVerified: jest.fn<IAuthSubjectStore['markEmailVerified']>(),
  };
  const oauthLinks = {
    link: jest.fn<IDoctorOAuthLinkRepository['link']>(),
    findByProviderIdentity: (): Promise<DoctorOAuthLink | null> =>
      Promise.resolve(opts.linkForPuid ?? null),
    findByDoctor: (): Promise<DoctorOAuthLink[]> =>
      Promise.resolve(opts.doctorLinks ?? []),
    unlink: jest.fn<IDoctorOAuthLinkRepository['unlink']>(),
  };
  const events = { emit: jest.fn<IEventBus['emit']>() };
  const config = {
    get: (k: string, d?: unknown) => (k === 'NODE_ENV' ? 'test' : d),
    getOrThrow: () => 'x'.repeat(40),
  } as unknown as ConfigService;

  const kernel = new AuthKernel(
    { issue: () => 't', verify: () => ({}) } as never,
    subjects as unknown as IAuthSubjectStore,
    { hash: () => Promise.resolve('h'), verify: () => Promise.resolve(false) } as never,
    oauthLinks as unknown as IDoctorOAuthLinkRepository,
    events as unknown as IEventBus,
    config,
  );
  return { kernel, subjects, oauthLinks, events };
}

const link = (over: Partial<DoctorOAuthLink> = {}): DoctorOAuthLink => ({
  id: 'l1',
  doctorId: 'doc-1',
  provider: 'google',
  providerUserId: 'puid-1',
  linkedAt: new Date(),
  ...over,
});

describe('AuthKernel.resolveOAuthCallback (six-row decision table)', () => {
  it('Row 1 — provider email unverified → PROVIDER_EMAIL_NOT_VERIFIED', async () => {
    const { kernel } = makeKernel({});
    await expect(
      kernel.resolveOAuthCallback(identity({ emailVerified: false })),
    ).rejects.toMatchObject({
      code: AuthErrorCode.PROVIDER_EMAIL_NOT_VERIFIED,
    });
  });

  it('Row 2 — existing link → login as that doctor', async () => {
    const { kernel } = makeKernel({
      linkForPuid: link(),
      subjectsById: { 'doc-1': subject() },
    });
    const res = await kernel.resolveOAuthCallback(identity());
    expect(res).toEqual({ kind: 'session', subjectId: 'doc-1' });
  });

  it('Row 2 — existing link but suspended → ACCOUNT_NOT_ACTIVE', async () => {
    const { kernel } = makeKernel({
      linkForPuid: link(),
      subjectsById: { 'doc-1': subject({ canLogin: false }) },
    });
    await expect(kernel.resolveOAuthCallback(identity())).rejects.toMatchObject({
      code: AuthErrorCode.ACCOUNT_NOT_ACTIVE,
    });
  });

  it('Row 3 — account already has an identity from this provider → OAUTH_ACCOUNT_ALREADY_LINKED', async () => {
    const { kernel } = makeKernel({
      linkForPuid: null,
      doctorByEmail: subject(),
      doctorLinks: [link({ providerUserId: 'a-different-google-id' })],
    });
    await expect(kernel.resolveOAuthCallback(identity())).rejects.toMatchObject({
      code: AuthErrorCode.OAUTH_ACCOUNT_ALREADY_LINKED,
    });
  });

  it('Row 4 — no link, no local account → register', async () => {
    const { kernel } = makeKernel({ linkForPuid: null, doctorByEmail: null });
    const res = await kernel.resolveOAuthCallback(identity());
    expect(res.kind).toBe('register');
  });

  it('Row 5 — verified local account → link + login', async () => {
    const { kernel, oauthLinks } = makeKernel({
      linkForPuid: null,
      doctorByEmail: subject({ emailVerified: true }),
      doctorLinks: [],
    });
    const res = await kernel.resolveOAuthCallback(identity());
    expect(res).toEqual({ kind: 'session', subjectId: 'doc-1' });
    expect(oauthLinks.link).toHaveBeenCalledWith('doc-1', 'google', 'puid-1');
  });

  it('Row 6 — unverified local account → pre-hijacking claim (session)', async () => {
    const { kernel, subjects, oauthLinks, events } = makeKernel({
      linkForPuid: null,
      doctorByEmail: subject({ emailVerified: false }),
      doctorLinks: [],
    });
    const res = await kernel.resolveOAuthCallback(identity());
    expect(res).toEqual({ kind: 'session', subjectId: 'doc-1' });
    expect(subjects.clearPassword).toHaveBeenCalledWith('doc-1');
    expect(subjects.markEmailVerified).toHaveBeenCalledWith('doc-1');
    expect(oauthLinks.link).toHaveBeenCalledWith('doc-1', 'google', 'puid-1');
    expect(events.emit).toHaveBeenCalledWith(
      'auth.pending_account_claimed',
      expect.objectContaining({ credentialId: 'doc-1' }),
    );
  });
});
