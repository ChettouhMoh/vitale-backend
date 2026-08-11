import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthPrincipalResponse, DoctorLoginDto } from './doctor-login.dto';
import { Public } from '@/auth/decorators';
import { EmailIpThrottlerGuard } from '@/auth/guards';
import { AuthKernel } from '@/auth/kernel';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class DoctorLoginController {
  constructor(private readonly kernel: AuthKernel) {}

  @Post('doctor/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  // Security #8: 5 attempts / minute per (IP, email).
  @UseGuards(EmailIpThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log a doctor in with email + password' })
  @ApiResponse({ status: 200, type: AuthPrincipalResponse })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified / account not active' })
  async execute(
    @Body() dto: DoctorLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthPrincipalResponse> {
    const subject = await this.kernel.authenticatePassword(
      dto.email,
      dto.password,
    );
    // Tokens go into httpOnly cookies only — never the response body.
    this.kernel.issueSession(res, subject);
    return {
      id: subject.id,
      role: subject.role,
      email: subject.email,
      kycStatus: subject.kycStatus,
    };
  }
}
