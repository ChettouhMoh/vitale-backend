import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { IOAuthProvider, OAuthIdentity } from '@/auth/ports';
import { AuthErrorCode } from '@/auth/domain';
import { DomainError } from '@/common/errors/domain.error';

/**
 * GoogleOAuthProvider — the only place Google specifics live. It never
 * hand-rolls JWKS fetching or signature checks: `verifyIdToken` (from
 * google-auth-library) validates the `id_token`'s signature against Google's
 * keys and checks `iss`/`aud`. The `client_secret` and PKCE `code_verifier`
 * stay on the backend — only the authorization URL and the code round-trip
 * cross the wire.
 */
@Injectable()
export class GoogleOAuthProvider implements IOAuthProvider {
  readonly name = 'google';
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(config: ConfigService) {
    this.clientId = config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client({
      clientId: this.clientId,
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      redirectUri: config.getOrThrow<string>('GOOGLE_REDIRECT_URI'),
    });
  }

  buildAuthorizationUrl(p: { state: string; codeChallenge: string }): string {
    return this.client.generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      state: p.state,
      code_challenge_method: 'S256' as never, // enum in lib; string at runtime
      code_challenge: p.codeChallenge,
      // A refresh token is not needed — we mint our own session; keep it lean.
      access_type: 'online',
      prompt: 'select_account',
    });
  }

  async exchangeCode(p: {
    code: string;
    codeVerifier: string;
  }): Promise<OAuthIdentity> {
    const { tokens } = await this.client.getToken({
      code: p.code,
      codeVerifier: p.codeVerifier,
    });
    if (!tokens.id_token) {
      throw new DomainError(
        AuthErrorCode.OAUTH_STATE_MISMATCH,
        'Google returned no id_token',
        400,
      );
    }

    // Verifies signature against Google's JWKS and checks iss + aud.
    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new DomainError(
        AuthErrorCode.OAUTH_STATE_MISMATCH,
        'Google id_token missing subject or email',
        400,
      );
    }

    return {
      provider: this.name,
      providerUserId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      suggestedName: payload.name ?? null,
      suggestedAvatar: payload.picture ?? null,
      locale: payload.locale ?? null,
    };
  }
}
