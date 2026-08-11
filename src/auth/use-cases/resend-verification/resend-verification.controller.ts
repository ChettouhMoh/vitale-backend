import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { ResendVerificationDto } from './resend-verification.dto';
import { Public } from '@/auth/decorators';
import { EmailIpThrottlerGuard } from '@/auth/guards';
import { TokenPurpose } from '@/auth/domain';
import { IAuthSubjectStore, ITokenIssuer } from '@/auth/ports';
import { IEventBus } from '@/shared/events/ports';

const VERIFY_TTL_MS = 7 * 60 * 1000;

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class ResendVerificationController {
  private readonly appUrl: string;

  constructor(
    @Inject(IAuthSubjectStore) private readonly subjects: IAuthSubjectStore,
    @Inject(ITokenIssuer) private readonly tokens: ITokenIssuer,
    @Inject(IEventBus) private readonly events: IEventBus,
    config: ConfigService,
  ) {
    this.appUrl = config.getOrThrow<string>('APP_URL');
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(EmailIpThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60 * 60_000 } }) // 3 / hour
  @ApiOperation({ summary: 'Resend the email-verification link' })
  @ApiResponse({ status: 202, description: 'Accepted (identical whether or not the account exists)' })
  async execute(
    @Body() dto: ResendVerificationDto,
  ): Promise<{ status: 'accepted' }> {
    const subject = await this.subjects.findByEmail(dto.email);

    // Only act for a real, still-unverified account. Never reveal which case
    // this was — the response below is identical regardless.
    if (subject && !subject.emailVerified) {
      const token = this.tokens.issue(TokenPurpose.EmailVerify, {
        sub: subject.id,
        email: subject.email,
      });
      await this.events.emit('auth.email_verification_requested', {
        credentialId: subject.id,
        email: subject.email,
        verificationLink: `${this.appUrl}/verify-email/${token}`,
        expiresAt: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
        locale: 'fr',
      });
    }

    return { status: 'accepted' };
  }
}
