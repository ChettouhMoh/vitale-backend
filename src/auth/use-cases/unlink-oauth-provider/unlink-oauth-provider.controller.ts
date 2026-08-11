import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators';
import { AuthErrorCode, type AuthPrincipal } from '@/auth/domain';
import {
  IAuthSubjectStore,
  IDoctorOAuthLinkRepository,
} from '@/auth/ports';
import { DomainError } from '@/common/errors/domain.error';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class UnlinkOAuthProviderController {
  constructor(
    @Inject(IAuthSubjectStore) private readonly subjects: IAuthSubjectStore,
    @Inject(IDoctorOAuthLinkRepository)
    private readonly oauthLinks: IDoctorOAuthLinkRepository,
  ) {}

  @Delete('oauth/:provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink a provider from the current account' })
  @ApiResponse({ status: 204, description: 'Provider unlinked' })
  @ApiResponse({ status: 400, description: 'Would leave no way to log in' })
  @ApiResponse({ status: 404, description: 'Provider not linked' })
  async execute(
    @Param('provider') providerName: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<void> {
    const subject = await this.subjects.findById(principal.id);
    if (!subject) {
      throw new DomainError(
        AuthErrorCode.UNAUTHENTICATED,
        'Subject no longer exists',
        401,
      );
    }

    const links = await this.oauthLinks.findByDoctor(principal.id);
    const target = links.find((l) => l.provider === providerName);
    if (!target) {
      throw new DomainError(
        AuthErrorCode.OAUTH_PROVIDER_NOT_LINKED,
        `No ${providerName} provider is linked to this account`,
        404,
      );
    }

    // Refuse to remove the last remaining way to authenticate.
    const remaining = links.filter((l) => l.provider !== providerName).length;
    if (subject.passwordHash === null && remaining === 0) {
      throw new DomainError(
        AuthErrorCode.CANNOT_UNLINK_LAST_AUTH_METHOD,
        'Cannot unlink the only remaining sign-in method; set a password first',
        400,
      );
    }

    await this.oauthLinks.unlink(principal.id, providerName);
  }
}
