import { describe, it, expect, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { AuthKernel } from './auth-kernel.service';
import { AuthErrorCode, Role } from '@/auth/domain';
import type {
  AuthSubject,
  IAuthSubjectStore,
  IDoctorOAuthLinkRepository,
  OAuthIdentity,
} from '@/auth/ports';
import type { IEventBus } from '@/shared/events/ports';
import { DomainError } from '@/common/errors/domain.error';

/**
 * The attack: someone signs up with the victim's email, never verifies, and
 * waits. When the victim later signs in with Google, a naive merge would keep
 * the attacker's password on the victim's now-verified account. The defence
 * (row 6) destroys the unproven password.
 */
describe('Pre-hijacking defence (OAuth callback row 6)', () => {
  function setup() {
    // Mutable "victim" row the fake store mutates in place.
    const victim: AuthSubject = {
      id: 'doc-9',
      email: 'victim@x.dz',
      passwordHash: 'ATTACKER_HASH', // planted by the attacker
      emailVerified: false, // never verified
      role: Role.Doctor,
      kycStatus: 'pending',
      canLogin: true,
    };

    const subjects = {
      subjectType: 'doctor',
      findByEmail: (): Promise<AuthSubject | null> => Promise.resolve(victim),
      findById: (): Promise<AuthSubject | null> => Promise.resolve(victim),
      setPassword: jest.fn<IAuthSubjectStore['setPassword']>(),
      clearPassword: jest.fn(async () => {
        victim.passwordHash = null;
      }) as unknown as IAuthSubjectStore['clearPassword'],
      markEmailVerified: jest.fn(async () => {
        victim.emailVerified = true;
      }) as unknown as IAuthSubjectStore['markEmailVerified'],
    };
    const oauthLinks = {
      link: jest.fn<IDoctorOAuthLinkRepository['link']>(),
      findByProviderIdentity: () => Promise.resolve(null),
      findByDoctor: () => Promise.resolve([]),
      unlink: jest.fn<IDoctorOAuthLinkRepository['unlink']>(),
    };
    const events = { emit: jest.fn<IEventBus['emit']>() };
    // The attacker's password only "matches" if a verify is ever attempted.
    const hasher = {
      hash: (p: string): Promise<string> => Promise.resolve('HASH:' + p),
      verify: (h: string, p: string): Promise<boolean> =>
        Promise.resolve(h === 'ATTACKER_HASH' && p === 'attacker-pw'),
    };
    const config = {
      get: (k: string, d?: unknown) => (k === 'NODE_ENV' ? 'test' : d),
      getOrThrow: () => 'x'.repeat(40),
    } as unknown as ConfigService;

    const kernel = new AuthKernel(
      { issue: () => 't', verify: () => ({}) } as never,
      subjects as unknown as IAuthSubjectStore,
      hasher as never,
      oauthLinks as unknown as IDoctorOAuthLinkRepository,
      events as unknown as IEventBus,
      config,
    );

    const identity: OAuthIdentity = {
      provider: 'google',
      providerUserId: 'g-victim',
      email: 'victim@x.dz',
      emailVerified: true,
      suggestedName: null,
      suggestedAvatar: null,
      locale: 'fr',
    };
    return { kernel, subjects, oauthLinks, events, victim, identity };
  }

  it('destroys the password, verifies the email, links the provider, emits the claim', async () => {
    const { kernel, subjects, oauthLinks, events, victim, identity } = setup();

    const res = await kernel.resolveOAuthCallback(identity);

    expect(res.kind).toBe('session');
    expect(subjects.clearPassword).toHaveBeenCalledWith('doc-9');
    expect(subjects.markEmailVerified).toHaveBeenCalledWith('doc-9');
    expect(oauthLinks.link).toHaveBeenCalledWith('doc-9', 'google', 'g-victim');
    expect(events.emit).toHaveBeenCalledWith(
      'auth.pending_account_claimed',
      expect.objectContaining({ credentialId: 'doc-9' }),
    );
    expect(victim.passwordHash).toBeNull();
    expect(victim.emailVerified).toBe(true);
  });

  it("the attacker's old password no longer authenticates", async () => {
    const { kernel } = setup();
    // Claim the account via OAuth first.
    await kernel.resolveOAuthCallback({
      provider: 'google',
      providerUserId: 'g-victim',
      email: 'victim@x.dz',
      emailVerified: true,
      suggestedName: null,
      suggestedAvatar: null,
      locale: 'fr',
    });
    // Now the planted password is gone → generic invalid credentials.
    let code = '';
    try {
      await kernel.authenticatePassword('victim@x.dz', 'attacker-pw');
    } catch (e) {
      code = (e as DomainError).code;
    }
    expect(code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
  });
});
