import { Controller, Get, Param, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { VaccineResponse } from './get-patient-vaccines.response';
import { IVaccineRepository } from '@/patient-record/vaccine/ports/vaccine.repository.interface';

class PatientIdParam {
  @IsString()
  patientId!: string;
}

@ApiTags('Vaccines')
@Controller({ path: 'patients', version: '1' })
export class GetPatientVaccinesController {
  constructor(
    @Inject(IVaccineRepository)
    private readonly vaccineRepository: IVaccineRepository,
  ) {}

  @Get(':patientId/vaccines')
  @ApiOperation({ summary: "List all vaccines for a patient" })
  @ApiParam({ name: 'patientId', description: 'Patient id' })
  @ApiResponse({ status: 200, type: [VaccineResponse] })
  async execute(
    @Param() { patientId }: PatientIdParam,
  ): Promise<VaccineResponse[]> {
    // Empty list when the patient has no vaccines — never 404 here.
    const vaccines = await this.vaccineRepository.findByPatientId(patientId);
    return vaccines.map((v) => VaccineResponse.from(v));
  }
}
