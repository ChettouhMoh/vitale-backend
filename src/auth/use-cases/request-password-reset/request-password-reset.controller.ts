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
import { RequestPasswordResetDto } from './request-password-reset.dto';
import { Public } from '@/auth/decorators';
import { EmailIpThrottlerGuard } from '@/auth/guards';
import { TokenPurpose } from '@/auth/domain';
import { IAuthSubjectStore, ITokenIssuer } from '@/auth/ports';
import { IEventBus } from '@/shared/events/ports';

const RESET_TTL_MS = 15 * 60 * 1000;
/** Floor on response time — the existence branch does more work; pad the rest up to this. */
const MIN_RESPONSE_MS = 400;

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class RequestPasswordResetController {
  private readonly appUrl: string;

  constructor(
    @Inject(IAuthSubjectStore) private readonly subjects: IAuthSubjectStore,
    @Inject(ITokenIssuer) private readonly tokens: ITokenIssuer,
    @Inject(IEventBus) private readonly events: IEventBus,
    config: ConfigService,
  ) {
    this.appUrl = config.getOrThrow<string>('APP_URL');
  }

  @Post('password/forgot')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(EmailIpThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60 * 60_000 } }) // 3 / hour, per (IP, email)
  @ApiOperation({ summary: 'Request a password-reset link' })
  @ApiResponse({ status: 202, description: 'Accepted (identical response whether or not the account exists)' })
  async execute(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<{ status: 'accepted' }> {
    const startedAt = Date.now();

    const subject = await this.subjects.findByEmail(dto.email);
    // Only an account that HAS a password can reset one. OAuth-only accounts
    // silently do nothing (and reveal nothing).
    if (subject && subject.passwordHash !== null) {
      const token = this.tokens.issue(TokenPurpose.PasswordReset, {
        sub: subject.id,
        email: subject.email,
      });
      await this.events.emit('auth.password_reset_requested', {
        credentialId: subject.id,
        email: subject.email,
        resetLink: `${this.appUrl}/reset-password/${token}`,
        expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
        locale: 'fr',
      });
    }

    // Equalise timing: a faster "no such account" path is itself an existence
    // oracle, so pad every response up to a fixed floor.
    await this.padTiming(startedAt);
    return { status: 'accepted' };
  }

  private async padTiming(startedAt: number): Promise<void> {
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
    }
  }
}
