import {
  Controller,
  Post,
  Param,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AddMedicationDto } from './add-medication.dto';
import { MedicationResponse } from '../get-patient-medications/get-patient-medications.response';
import { Medication } from '@/patient-record/medication/domain/medication';
import { IMedicationRepository } from '@/patient-record/medication/ports/medication.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';

class PatientIdParam {
  @IsString()
  patientId!: string;
}

@ApiTags('Medications')
@ApiCookieAuth()
@Controller({ path: 'patients', version: '1' })
export class AddMedicationController {
  constructor(
    @Inject(IMedicationRepository)
    private readonly medicationRepository: IMedicationRepository,
    private readonly logger: LoggerService,
  ) {}

  @Post(':patientId/medications')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add a medication to a patient's list" })
  @ApiParam({ name: 'patientId', description: 'Patient UUID v7' })
  @ApiBody({ type: AddMedicationDto })
  @ApiResponse({ status: 201, type: MedicationResponse })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async execute(
    @Param() { patientId }: PatientIdParam,
    @Body() dto: AddMedicationDto,
  ): Promise<MedicationResponse> {
    const medication = Medication.createNew(patientId, {
      name: dto.name,
      dosage: dto.dosage,
      frequency: dto.frequency,
      route: dto.route,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      status: dto.status,
      instructions: dto.instructions ?? null,
    });

    await this.medicationRepository.save(medication);

    this.logger.info('Medication added', {
      patientId,
      medicationId: medication.id,
    });

    return MedicationResponse.from(medication);
  }
}
