import {
  Controller,
  Patch,
  Param,
  Body,
  Inject,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { UpdateChronicDiseasesDto } from './update-chronic-diseases.dto';
import { PatientErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IPatientRepository } from '@/patient-record/patient/ports/patient.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';

class PatientIdParam {
  @IsString()
  id!: string;
}

@ApiTags('Patients')
@ApiCookieAuth()
@Controller({ path: 'patients', version: '1' })
export class UpdateChronicDiseasesController {
  constructor(
    @Inject(IPatientRepository)
    private readonly patientRepository: IPatientRepository,
    private readonly logger: LoggerService,
  ) {}

  @Patch(':id/chronic-diseases')
  @ApiOperation({ summary: "Replace a patient's chronic-disease list" })
  @ApiParam({ name: 'id', description: 'Patient UUID v7' })
  @ApiResponse({ status: 200, description: 'Chronic diseases updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async execute(
    @Param() { id }: PatientIdParam,
    @Body() dto: UpdateChronicDiseasesDto,
  ): Promise<{ success: boolean }> {
    const patient = await this.patientRepository.findById(id);
    if (!patient) {
      throw new DomainError(
        PatientErrorCode.PATIENT_NOT_FOUND,
        `Patient ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    patient.updateChronicDiseases(dto.chronicDiseases);
    await this.patientRepository.save(patient);

    this.logger.info('Patient chronic diseases updated', { patientId: id });

    return { success: true };
  }
}
