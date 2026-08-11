import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '@/auth/decorators';
import { TokenPurpose } from '@/auth/domain';
import { ITokenIssuer } from '@/auth/ports';
import { AuthKernel, OAuthProviderRegistry } from '@/auth/kernel';
import { DomainError } from '@/common/errors/domain.error';
import { AuthErrorCode } from '@/common/errors/codes/auth.errors';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class OAuthCallbackController {
  private readonly appUrl: string;

  constructor(
    private readonly registry: OAuthProviderRegistry,
    private readonly kernel: AuthKernel,
    @Inject(ITokenIssuer) private readonly tokens: ITokenIssuer,
    config: ConfigService,
  ) {
    this.appUrl = config.getOrThrow<string>('APP_URL');
  }

  @Get('oauth/:provider/callback')
  @Public()
  @ApiOperation({
    summary: 'Handle the provider redirect back (login / signup / link)',
  })
  @ApiResponse({ status: 302, description: 'Redirect into the app' })
  async callback(
    @Param('provider') providerName: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res() res: Response,
  ): Promise<void> {
    // Verify state against the signed cookie (CSRF + PKCE binding).
    const statePayload = this.kernel.readStateCookie(
      req.cookies?.[this.kernel.stateCookieName()],
    );
    if (
      statePayload.state !== state ||
      statePayload.provider !== providerName
    ) {
      throw new DomainError(
        AuthErrorCode.OAUTH_STATE_MISMATCH,
        'OAuth state does not match',
        400,
      );
    }
    res.clearCookie(this.kernel.stateCookieName(), { path: '/' });

    const provider = this.registry.get(providerName);
    const identity = await provider.exchangeCode({
      code,
      codeVerifier: statePayload.codeVerifier,
    });

    // Authenticated link flow: the state was minted by /oauth/:provider/link.
    if (statePayload.linkDoctorId) {
      await this.kernel.linkIdentity(statePayload.linkDoctorId, identity);
      res.redirect(`${this.appUrl}/settings/security?linked=${providerName}`);
      return;
    }

    // Login / signup resolution (the six-row decision table).
    const resolution = await this.kernel.resolveOAuthCallback(identity);
    if (resolution.kind === 'session') {
      await this.kernel.issueSessionById(res, resolution.subjectId);
      res.redirect(`${this.appUrl}/overview`);
      return;
    }

    // New doctor: mint a 30m registration ticket and send them to the
    // completion form to supply specialty + license (which the provider cannot).
    const ticket = this.tokens.issue(TokenPurpose.OAuthTicket, {
      sub: resolution.identity.providerUserId,
      provider: resolution.identity.provider,
      providerUserId: resolution.identity.providerUserId,
      email: resolution.identity.email,
      suggestedName: resolution.identity.suggestedName,
    });
    this.kernel.setTicketCookie(res, ticket);
    res.redirect(`${this.appUrl}/oauth/complete`);
  }
}
