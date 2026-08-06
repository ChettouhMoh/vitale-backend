import { Controller, Patch, Body, Inject, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UpdateAffiliationDto } from './update-affiliation.dto';
import { DoctorResponse } from '../get-doctor';
import { DoctorErrorCode } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { DomainError } from '@/common/errors/domain.error';
import { CurrentDoctor } from '@/common/decorators/current-doctor.decorator';

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class UpdateAffiliationController {
  constructor(
    @Inject(IDoctorRepository)
    private readonly doctors: IDoctorRepository,
  ) {}

  @Patch('me/affiliation')
  @ApiOperation({ summary: 'Update practice affiliation (workplace)' })
  @ApiBody({ type: UpdateAffiliationDto })
  @ApiResponse({ status: 200, type: DoctorResponse })
  @ApiResponse({
    status: 400,
    description: 'department/name not applicable for this workplace type',
  })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  async execute(
    @CurrentDoctor() doctorId: string,
    @Body() dto: UpdateAffiliationDto,
  ): Promise<DoctorResponse> {
    const doctor = await this.doctors.findById(doctorId);
    if (!doctor) {
      throw new DomainError(
        DoctorErrorCode.DOCTOR_NOT_FOUND,
        `Doctor ${doctorId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    doctor.updateAffiliation(
      dto.workplaceName ?? null,
      dto.workplaceType,
      dto.department ?? null,
    );
    await this.doctors.save(doctor);

    return DoctorResponse.from(doctor);
  }
}
