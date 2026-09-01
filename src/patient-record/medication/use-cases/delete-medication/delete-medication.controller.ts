import { Controller, Delete, Param, Inject, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { MedicationErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IMedicationRepository } from '@/patient-record/medication/ports/medication.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';

@ApiTags('Medications')
@ApiCookieAuth()
@Controller({ path: 'medications', version: '1' })
export class DeleteMedicationController {
  constructor(
    @Inject(IMedicationRepository)
    private readonly medicationRepository: IMedicationRepository,
    private readonly logger: LoggerService,
  ) {}

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a medication' })
  @ApiParam({ name: 'id', description: 'Medication id' })
  @ApiResponse({ status: 200, description: 'Medication deleted' })
  @ApiResponse({ status: 404, description: 'Medication not found' })
  async execute(@Param('id') id: string): Promise<{ success: boolean }> {
    const medication = await this.medicationRepository.findById(id);
    if (!medication) {
      throw new DomainError(
        MedicationErrorCode.MEDICATION_NOT_FOUND,
        `Medication ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.medicationRepository.delete(id);

    this.logger.info('Medication deleted', { medicationId: id });

    return { success: true };
  }
}
