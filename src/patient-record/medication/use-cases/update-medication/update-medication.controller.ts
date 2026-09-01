import {
  Controller,
  Patch,
  Param,
  Body,
  Inject,
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
import { UpdateMedicationDto } from './update-medication.dto';
import { MedicationResponse } from '../get-patient-medications/get-patient-medications.response';
import { MedicationErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IMedicationRepository } from '@/patient-record/medication/ports/medication.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';

@ApiTags('Medications')
@ApiCookieAuth()
@Controller({ path: 'medications', version: '1' })
export class UpdateMedicationController {
  constructor(
    @Inject(IMedicationRepository)
    private readonly medicationRepository: IMedicationRepository,
    private readonly logger: LoggerService,
  ) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update a medication (partial)' })
  @ApiParam({ name: 'id', description: 'Medication id' })
  @ApiBody({ type: UpdateMedicationDto })
  @ApiResponse({ status: 200, type: MedicationResponse })
  @ApiResponse({ status: 404, description: 'Medication not found' })
  async execute(
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
  ): Promise<MedicationResponse> {
    const medication = await this.medicationRepository.findById(id);
    if (!medication) {
      throw new DomainError(
        MedicationErrorCode.MEDICATION_NOT_FOUND,
        `Medication ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Only the fields present in the DTO are applied (undefined = untouched).
    // name is not updatable, so it is not part of the DTO.
    medication.applyUpdate({
      dosage: dto.dosage,
      frequency: dto.frequency,
      route: dto.route,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: dto.status,
      instructions: dto.instructions,
    });

    await this.medicationRepository.save(medication);

    this.logger.info('Medication updated', { medicationId: id });

    return MedicationResponse.from(medication);
  }
}
