import { Controller, Patch, Body, Inject, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UpdateCredentialsDto } from './update-credentials.dto';
import { DoctorResponse } from '../get-doctor';
import { DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { DomainError } from '@/common/errors/domain.error';
import { CurrentDoctor } from '@/common/decorators/current-doctor.decorator';

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class UpdateCredentialsController {
  constructor(
    @Inject(IDoctorRepository)
    private readonly doctors: IDoctorRepository,
  ) {}

  @Patch('me/credentials')
  @ApiOperation({ summary: 'Update specialty and medical license number' })
  @ApiBody({ type: UpdateCredentialsDto })
  @ApiResponse({ status: 200, type: DoctorResponse })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  @ApiResponse({ status: 409, description: 'License already registered' })
  async execute(
    @CurrentDoctor() doctorId: string,
    @Body() dto: UpdateCredentialsDto,
  ): Promise<DoctorResponse> {
    const doctor = await this.doctors.findById(doctorId);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${doctorId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    doctor.updateCredentials(dto.specialty, dto.medicalLicenseNumber ?? null);
    // Repository re-checks license uniqueness → 409 on clash.
    await this.doctors.save(doctor);

    return DoctorResponse.from(doctor);
  }
}
