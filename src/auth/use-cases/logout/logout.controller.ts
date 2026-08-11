import { Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthKernel } from '@/auth/kernel';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class LogoutController {
  constructor(private readonly kernel: AuthKernel) {}

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out — clear the session cookies' })
  @ApiResponse({ status: 204, description: 'Session cookies cleared' })
  execute(@Res({ passthrough: true }) res: Response): void {
    // Stateless tokens have no server-side record, so logout can only expire the
    // cookies in THIS browser. It cannot revoke an access token already copied
    // elsewhere before its 1h expiry (the accepted consequence of no token
    // storage). The scoped, short-lived tokens bound that window.
    this.kernel.clearSession(res);
  }
}
