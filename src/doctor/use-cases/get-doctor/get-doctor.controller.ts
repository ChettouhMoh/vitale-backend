import { Controller, Get, Inject, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DoctorResponse } from './doctor.response';
import { DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { DomainError } from '@/common/errors/domain.error';
import { CurrentUser } from '@/auth/decorators';

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class GetDoctorController {
  constructor(
    @Inject(IDoctorRepository)
    private readonly doctors: IDoctorRepository,
  ) {}

  @Get('me')
  @ApiOperation({ summary: "Get the current doctor's core record" })
  @ApiResponse({ status: 200, type: DoctorResponse })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  async execute(@CurrentUser('id') doctorId: string): Promise<DoctorResponse> {
    const doctor = await this.doctors.findById(doctorId);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${doctorId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return DoctorResponse.from(doctor);
  }
}
