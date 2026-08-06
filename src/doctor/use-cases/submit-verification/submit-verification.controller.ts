import { Controller, Post, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DoctorResponse } from '../get-doctor';
import { DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { DomainError } from '@/common/errors/domain.error';
import { CurrentDoctor } from '@/common/decorators/current-doctor.decorator';

/**
 * Doctor submits their KYC for review: unverified|rejected → pending.
 * (KYC document upload itself is the attachment module's concern.)
 */
@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class SubmitVerificationController {
  constructor(
    @Inject(IDoctorRepository)
    private readonly doctors: IDoctorRepository,
  ) {}

  @Post('me/verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit KYC for verification (→ pending)' })
  @ApiResponse({ status: 200, type: DoctorResponse })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  @ApiResponse({
    status: 409,
    description: 'Not in a submittable state (already pending/verified)',
  })
  async execute(@CurrentDoctor() doctorId: string): Promise<DoctorResponse> {
    const doctor = await this.doctors.findById(doctorId);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${doctorId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    doctor.submitForVerification();
    await this.doctors.save(doctor);

    return DoctorResponse.from(doctor);
  }
}
