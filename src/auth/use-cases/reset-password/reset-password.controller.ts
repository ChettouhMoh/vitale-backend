import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResetPasswordDto } from './reset-password.dto';
import { Public } from '@/auth/decorators';
import { TokenPurpose } from '@/auth/domain';
import {
  IAuthSubjectStore,
  IPasswordHasher,
  ITokenIssuer,
} from '@/auth/ports';
import { IEventBus } from '@/shared/events/ports';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class ResetPasswordController {
  constructor(
    @Inject(ITokenIssuer) private readonly tokens: ITokenIssuer,
    @Inject(IPasswordHasher) private readonly hasher: IPasswordHasher,
    @Inject(IAuthSubjectStore) private readonly subjects: IAuthSubjectStore,
    @Inject(IEventBus) private readonly events: IEventBus,
  ) {}

  @Post('password/reset')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  @ApiResponse({ status: 204, description: 'Password changed' })
  @ApiResponse({ status: 401, description: 'Token invalid or expired' })
  async execute(@Body() dto: ResetPasswordDto): Promise<void> {
    const claims = this.tokens.verify(TokenPurpose.PasswordReset, dto.token);
    const hash = await this.hasher.hash(dto.newPassword);
    await this.subjects.setPassword(claims.sub, hash);
    // Receiving the email at this address proves ownership — so a reset also
    // verifies the email (covers a doctor who reset before ever verifying).
    await this.subjects.markEmailVerified(claims.sub);
    await this.events.emit('auth.password_changed', {
      credentialId: claims.sub,
      email: claims.email as string,
      locale: 'fr',
    });
    // Deliberately NO auto-login: a leaked link on a shared device would
    // otherwise hand over a live session, not just a password-change chance.
  }
}
