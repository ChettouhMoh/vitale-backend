import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '@/auth/decorators';
import { AuthKernel, OAuthProviderRegistry } from '@/auth/kernel';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class OAuthRedirectController {
  constructor(
    private readonly registry: OAuthProviderRegistry,
    private readonly kernel: AuthKernel,
  ) {}

  @Get('oauth/:provider')
  @Public()
  @ApiOperation({ summary: 'Begin an OAuth login flow (redirect to provider)' })
  @ApiResponse({ status: 302, description: 'Redirect to the provider' })
  @ApiResponse({ status: 404, description: 'Provider not supported' })
  redirect(
    @Param('provider') providerName: string,
    @Res() res: Response,
  ): void {
    const provider = this.registry.get(providerName); // 404 if unsupported
    const { state, codeVerifier, codeChallenge } = this.kernel.generatePkce();

    // state + PKCE verifier live ONLY in a signed, httpOnly, short-lived cookie.
    const cookie = this.kernel.buildStateCookie({
      provider: providerName,
      state,
      codeVerifier,
    });
    res.cookie(cookie.name, cookie.value, this.kernel.stateCookieOptions());

    res.redirect(provider.buildAuthorizationUrl({ state, codeChallenge }));
  }
}
