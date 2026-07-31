import { Controller, Delete, Param, Inject, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { VaccineErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IVaccineRepository } from '@/patient-record/vaccine/ports/vaccine.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';

@ApiTags('Vaccines')
@Controller({ path: 'vaccines', version: '1' })
export class DeleteVaccineController {
  constructor(
    @Inject(IVaccineRepository)
    private readonly vaccineRepository: IVaccineRepository,
    private readonly logger: LoggerService,
  ) {}

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vaccine' })
  @ApiParam({ name: 'id', description: 'Vaccine id' })
  @ApiResponse({ status: 200, description: 'Vaccine deleted' })
  @ApiResponse({ status: 404, description: 'Vaccine not found' })
  async execute(@Param('id') id: string): Promise<{ success: boolean }> {
    const vaccine = await this.vaccineRepository.findById(id);
    if (!vaccine) {
      throw new DomainError(
        VaccineErrorCode.VACCINE_NOT_FOUND,
        `Vaccine ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.vaccineRepository.delete(id);

    this.logger.info('Vaccine deleted', { vaccineId: id });

    return { success: true };
  }
}
