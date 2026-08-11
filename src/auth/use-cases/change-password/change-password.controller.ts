import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChangePasswordDto } from './change-password.dto';
import { CurrentUser } from '@/auth/decorators';
import { AuthErrorCode, type AuthPrincipal } from '@/auth/domain';
import { IAuthSubjectStore, IPasswordHasher } from '@/auth/ports';
import { IEventBus } from '@/shared/events/ports';
import { DomainError } from '@/common/errors/domain.error';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class ChangePasswordController {
  constructor(
    @Inject(IAuthSubjectStore) private readonly subjects: IAuthSubjectStore,
    @Inject(IPasswordHasher) private readonly hasher: IPasswordHasher,
    @Inject(IEventBus) private readonly events: IEventBus,
  ) {}

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change the current doctor’s password' })
  @ApiResponse({ status: 204, description: 'Password changed' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  async execute(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    const subject = await this.subjects.findById(principal.id);
    // No password set (OAuth-only) → there is nothing to match; the correct
    // path is set-password. Report as an incorrect current password.
    if (!subject || subject.passwordHash === null) {
      throw this.currentPasswordIncorrect();
    }
    const ok = await this.hasher.verify(
      subject.passwordHash,
      dto.currentPassword,
    );
    if (!ok) {
      throw this.currentPasswordIncorrect();
    }
    const hash = await this.hasher.hash(dto.newPassword);
    await this.subjects.setPassword(subject.id, hash);
    await this.events.emit('auth.password_changed', {
      credentialId: subject.id,
      email: subject.email,
      locale: 'fr',
    });
  }

  private currentPasswordIncorrect(): DomainError {
    return new DomainError(
      AuthErrorCode.CURRENT_PASSWORD_INCORRECT,
      'Current password is incorrect',
      400,
    );
  }
}
