import { Controller, Get, Param, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { MedicationResponse } from './get-patient-medications.response';
import { IMedicationRepository } from '@/patient-record/medication/ports/medication.repository.interface';

class PatientIdParam {
  @IsString()
  patientId!: string;
}

@ApiTags('Medications')
@Controller({ path: 'patients', version: '1' })
export class GetPatientMedicationsController {
  constructor(
    @Inject(IMedicationRepository)
    private readonly medicationRepository: IMedicationRepository,
  ) {}

  @Get(':patientId/medications')
  @ApiOperation({ summary: 'List all medications for a patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID v7' })
  @ApiResponse({ status: 200, type: [MedicationResponse] })
  async execute(
    @Param() { patientId }: PatientIdParam,
  ): Promise<MedicationResponse[]> {
    // Empty list when the patient has no medications — never 404 here.
    const medications = await this.medicationRepository.findByPatientId(patientId);
    return medications.map((m) => MedicationResponse.from(m));
  }
}
