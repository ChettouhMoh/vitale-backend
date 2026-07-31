import { Controller, Get, Param, Inject, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PatientResponse } from './get-patient.response';
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
export class GetPatientController {
  constructor(
    @Inject(IPatientRepository)
    private readonly patientRepository: IPatientRepository,
    private readonly logger: LoggerService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a patient record by ID' })
  @ApiParam({
    name: 'id',
    description: 'Patient UUID v7',
    example: '01932b3a-7c1d-7000-8000-123456789abc',
  })
  @ApiResponse({ status: 200, type: PatientResponse })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async execute(@Param() { id }: PatientIdParam): Promise<PatientResponse> {
    const patient = await this.patientRepository.findById(id);

    if (!patient) {
      throw new DomainError(
        PatientErrorCode.PATIENT_NOT_FOUND,
        `Patient ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    this.logger.debug('Patient record fetched', { patientId: id });

    return PatientResponse.from(patient);
  }
}
