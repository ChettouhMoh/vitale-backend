import { Controller, Get, HttpStatus, Inject } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators';
import type { AuthPrincipal } from '@/auth/domain';
import { DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { DomainError } from '@/common/errors/domain.error';

export class AuthMeResponse {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ example: 'doctor' }) role!: string;
  @ApiProperty({ example: 'verified' }) kycStatus!: string;
  @ApiProperty() emailVerified!: boolean;
}

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class MeController {
  constructor(
    @Inject(IDoctorRepository) private readonly doctors: IDoctorRepository,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Fetch the current authenticated principal, fresh' })
  @ApiResponse({ status: 200, type: AuthMeResponse })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async execute(@CurrentUser() principal: AuthPrincipal): Promise<AuthMeResponse> {
    // The token carries a snapshot; a client that just reloaded needs fresh
    // profile data (name, KYC), so THIS endpoint — unlike @CurrentUser() — hits
    // the database.
    const doctor = await this.doctors.findById(principal.id);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${principal.id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      id: doctor.id,
      email: doctor.email,
      fullName: doctor.fullName,
      role: principal.role,
      kycStatus: doctor.verificationStatus,
      emailVerified: doctor.emailVerified,
    };
  }
}
