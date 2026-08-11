import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VerifyEmailDto } from './verify-email.dto';
import { Public } from '@/auth/decorators';
import { TokenPurpose } from '@/auth/domain';
import { IAuthSubjectStore, ITokenIssuer } from '@/auth/ports';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class VerifyEmailController {
  constructor(
    @Inject(ITokenIssuer) private readonly tokens: ITokenIssuer,
    @Inject(IAuthSubjectStore) private readonly subjects: IAuthSubjectStore,
  ) {}

  // POST, not GET, deliberately. Email clients and corporate scanners (Outlook
  // Safe Links, Gmail's scanner, antivirus proxies) prefetch every URL in a
  // message. On GET, the link would be consumed before the human ever clicked.
  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm an email address from its verification token' })
  @ApiResponse({ status: 200, description: 'Email verified (idempotent)' })
  @ApiResponse({ status: 401, description: 'Token invalid or expired' })
  async execute(@Body() dto: VerifyEmailDto): Promise<{ ok: true }> {
    const claims = this.tokens.verify(TokenPurpose.EmailVerify, dto.token);
    // Idempotent — verifying an already-verified account succeeds silently.
    await this.subjects.markEmailVerified(claims.sub);
    return { ok: true };
  }
}
