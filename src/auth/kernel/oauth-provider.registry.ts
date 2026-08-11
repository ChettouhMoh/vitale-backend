import { Inject, Injectable } from '@nestjs/common';
import { IOAuthProvider } from '@/auth/ports';
import { AuthErrorCode } from '@/auth/domain';
import { DomainError } from '@/common/errors/domain.error';

/** DI token for the list of enabled OAuth provider adapters. */
export const OAUTH_PROVIDERS = Symbol('OAUTH_PROVIDERS');

/**
 * Maps provider name → adapter so routes can be `/auth/oauth/:provider`. Adding
 * Apple later is one adapter class plus one entry in the module's provider list.
 *
 * Apple note (why the decision table keys on `providerUserId`, never email):
 * Apple returns the user's email only on the FIRST authorization and supports
 * private-relay addresses that can change or be disabled. The provider's stable
 * subject id (`providerUserId`) is the only durable identifier, so links and the
 * whole callback decision table are keyed on it.
 */
@Injectable()
export class OAuthProviderRegistry {
  private readonly providers: Map<string, IOAuthProvider>;

  constructor(@Inject(OAUTH_PROVIDERS) providers: IOAuthProvider[]) {
    this.providers = new Map(providers.map((p) => [p.name, p]));
  }

  get(name: string): IOAuthProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new DomainError(
        AuthErrorCode.OAUTH_PROVIDER_NOT_SUPPORTED,
        `OAuth provider '${name}' is not supported`,
        404,
      );
    }
    return provider;
  }
}
