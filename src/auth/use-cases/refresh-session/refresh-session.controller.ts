import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '@/auth/decorators';
import { AuthKernel } from '@/auth/kernel';
import { AuthErrorCode, SessionPolicy, TokenPurpose } from '@/auth/domain';
import { ITokenIssuer } from '@/auth/ports';
import { DomainError } from '@/common/errors/domain.error';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class RefreshSessionController {
  constructor(
    @Inject(ITokenIssuer) private readonly tokens: ITokenIssuer,
    private readonly kernel: AuthKernel,
  ) {}

  @Post('refresh')
  // @Public so the (possibly expired) ACCESS cookie is not required — this
  // endpoint authenticates via the REFRESH cookie instead. The scoped refresh
  // cookie path means the refresh token is the only credential the browser even
  // sends here.
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mint a fresh access token from the refresh cookie' })
  @ApiResponse({ status: 200, description: 'New session cookies set' })
  @ApiResponse({ status: 401, description: 'Missing or invalid refresh token' })
  async execute(
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const token = req.cookies?.[SessionPolicy.DOCTOR.refreshCookieName];
    if (!token) {
      throw new DomainError(
        AuthErrorCode.UNAUTHENTICATED,
        'Missing refresh token',
        401,
      );
    }
    const claims = this.tokens.verify(TokenPurpose.DoctorRefresh, token);
    // Sliding session: re-mint BOTH tokens so activity extends the session.
    await this.kernel.issueSessionById(res, claims.sub);
    return { ok: true };
  }
}
