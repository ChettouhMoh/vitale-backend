import { Controller, Param, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '@/auth/decorators';
import type { AuthPrincipal } from '@/auth/domain';
import { AuthKernel, OAuthProviderRegistry } from '@/auth/kernel';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class LinkOAuthProviderController {
  constructor(
    private readonly registry: OAuthProviderRegistry,
    private readonly kernel: AuthKernel,
  ) {}

  @Post('oauth/:provider/link')
  @ApiOperation({ summary: 'Start linking a provider to the current account' })
  @ApiResponse({ status: 201, description: 'Authorization URL to redirect to' })
  link(
    @Param('provider') providerName: string,
    @CurrentUser() principal: AuthPrincipal,
    @Res({ passthrough: true }) res: Response,
  ): { authorizationUrl: string } {
    const provider = this.registry.get(providerName);
    const { state, codeVerifier, codeChallenge } = this.kernel.generatePkce();

    // The current doctor id is bound INTO the signed state. state verification
    // on the callback is mandatory here: without it an attacker could link
    // THEIR provider account to a victim's session — a permanent backdoor.
    const cookie = this.kernel.buildStateCookie({
      provider: providerName,
      state,
      codeVerifier,
      linkDoctorId: principal.id,
    });
    res.cookie(cookie.name, cookie.value, this.kernel.stateCookieOptions());

    return {
      authorizationUrl: provider.buildAuthorizationUrl({ state, codeChallenge }),
    };
  }
}
