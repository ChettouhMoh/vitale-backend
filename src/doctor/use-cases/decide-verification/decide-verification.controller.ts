import {
  Controller,
  Patch,
  Param,
  Body,
  Inject,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { DecideVerificationDto } from './decide-verification.dto';
import { DoctorResponse } from '../get-doctor';
import { DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { DomainError } from '@/common/errors/domain.error';
import { CurrentAdmin } from '@/common/decorators/current-admin.decorator';

/**
 * Admin decision on a doctor's KYC: pending → verified | rejected. The acting
 * admin's id is recorded on the doctor as `verifiedBy`. A rejection requires a
 * reason (enforced by the verification VO).
 */
@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class DecideVerificationController {
  constructor(
    @Inject(IDoctorRepository)
    private readonly doctors: IDoctorRepository,
  ) {}

  @Patch(':doctorId/verification')
  @ApiOperation({ summary: 'Admin: verify or reject a doctor' })
  @ApiParam({ name: 'doctorId', description: 'Doctor id being reviewed' })
  @ApiBody({ type: DecideVerificationDto })
  @ApiResponse({ status: 200, type: DoctorResponse })
  @ApiResponse({ status: 400, description: 'Rejection reason required' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  @ApiResponse({
    status: 409,
    description: 'Doctor is not pending (invalid transition)',
  })
  async execute(
    @Param('doctorId') doctorId: string,
    @CurrentAdmin() adminId: string,
    @Body() dto: DecideVerificationDto,
  ): Promise<DoctorResponse> {
    const doctor = await this.doctors.findById(doctorId);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${doctorId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.decision === 'verified') {
      doctor.approveVerification(adminId);
    } else {
      // Empty reason → domain throws VERIFICATION_REASON_REQUIRED (400).
      doctor.rejectVerification(adminId, dto.reason ?? '');
    }

    await this.doctors.save(doctor);
    return DoctorResponse.from(doctor);
  }
}
