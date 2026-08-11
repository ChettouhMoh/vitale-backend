import { describe, it, expect, jest } from '@jest/globals';
import { UnlinkOAuthProviderController } from './unlink-oauth-provider.controller';
import { AuthErrorCode, Role, type AuthPrincipal } from '@/auth/domain';
import type {
  AuthSubject,
  DoctorOAuthLink,
  IAuthSubjectStore,
  IDoctorOAuthLinkRepository,
} from '@/auth/ports';
import { DomainError } from '@/common/errors/domain.error';

const principal: AuthPrincipal = {
  id: 'doc-1',
  role: Role.Doctor,
  email: 'a@x.dz',
  kycStatus: 'pending',
  jti: 'j',
};

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

const link = (provider: string): DoctorOAuthLink => ({
  id: 'l-' + provider,
  doctorId: 'doc-1',
  provider,
  providerUserId: 'u-' + provider,
  linkedAt: new Date(),
});

function make(subj: AuthSubject, links: DoctorOAuthLink[]) {
  const unlink = jest.fn<IDoctorOAuthLinkRepository['unlink']>();
  const subjects = {
    findById: () => Promise.resolve(subj),
  } as unknown as IAuthSubjectStore;
  const oauthLinks = {
    findByDoctor: () => Promise.resolve(links),
    unlink,
  } as unknown as IDoctorOAuthLinkRepository;
  return {
    controller: new UnlinkOAuthProviderController(subjects, oauthLinks),
    unlink,
  };
}

async function codeOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    throw new Error('expected DomainError');
  } catch (e) {
    return (e as DomainError).code;
  }
}

describe('UnlinkOAuthProviderController', () => {
  it('refuses to remove the LAST auth method (no password, only this link)', async () => {
    const { controller, unlink } = make(subject({ passwordHash: null }), [
      link('google'),
    ]);
    expect(await codeOf(() => controller.execute('google', principal))).toBe(
      AuthErrorCode.CANNOT_UNLINK_LAST_AUTH_METHOD,
    );
    expect(unlink).not.toHaveBeenCalled();
  });

  it('allows unlink when a password still remains', async () => {
    const { controller, unlink } = make(subject({ passwordHash: 'HASH' }), [
      link('google'),
    ]);
    await controller.execute('google', principal);
    expect(unlink).toHaveBeenCalledWith('doc-1', 'google');
  });

  it('allows unlink when another provider link remains', async () => {
    const { controller, unlink } = make(subject({ passwordHash: null }), [
      link('google'),
      link('apple'),
    ]);
    await controller.execute('google', principal);
    expect(unlink).toHaveBeenCalledWith('doc-1', 'google');
  });

  it('404s when the provider is not linked', async () => {
    const { controller } = make(subject(), [link('apple')]);
    expect(await codeOf(() => controller.execute('google', principal))).toBe(
      AuthErrorCode.OAUTH_PROVIDER_NOT_LINKED,
    );
  });
});
