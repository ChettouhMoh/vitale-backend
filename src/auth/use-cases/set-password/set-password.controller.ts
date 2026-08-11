import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SetPasswordDto } from './set-password.dto';
import { CurrentUser } from '@/auth/decorators';
import { type AuthPrincipal } from '@/auth/domain';
import { IAuthSubjectStore, IPasswordHasher } from '@/auth/ports';
import { IEventBus } from '@/shared/events/ports';
import { DomainError } from '@/common/errors/domain.error';
import { AuthErrorCode } from '@/common/errors/codes/auth.errors';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class SetPasswordController {
  constructor(
    @Inject(IAuthSubjectStore) private readonly subjects: IAuthSubjectStore,
    @Inject(IPasswordHasher) private readonly hasher: IPasswordHasher,
    @Inject(IEventBus) private readonly events: IEventBus,
  ) {}

  @Post('password/set')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add a first password to an OAuth-only account' })
  @ApiResponse({ status: 204, description: 'Password set' })
  @ApiResponse({ status: 409, description: 'A password already exists' })
  async execute(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: SetPasswordDto,
  ): Promise<void> {
    const subject = await this.subjects.findById(principal.id);
    if (!subject) {
      throw new DomainError(
        AuthErrorCode.UNAUTHENTICATED,
        'Subject no longer exists',
        401,
      );
    }
    // This endpoint is for adding a FIRST password; changing an existing one
    // goes through /password/change (which proves the current password).
    if (subject.passwordHash !== null) {
      throw new DomainError(
        AuthErrorCode.PASSWORD_ALREADY_SET,
        'A password is already set for this account',
        409,
      );
    }
    const hash = await this.hasher.hash(dto.newPassword);
    await this.subjects.setPassword(subject.id, hash);
    await this.events.emit('auth.password_changed', {
      credentialId: subject.id,
      email: subject.email,
      locale: 'fr',
    });
  }
}
