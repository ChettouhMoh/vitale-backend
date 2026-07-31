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
} from '@nestjs/swagger';
import { UpdateVaccineDto } from './update-vaccine.dto';
import { VaccineResponse } from '../get-patient-vaccines/get-patient-vaccines.response';
import { VaccineErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IVaccineRepository } from '@/patient-record/vaccine/ports/vaccine.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';

@ApiTags('Vaccines')
@Controller({ path: 'vaccines', version: '1' })
export class UpdateVaccineController {
  constructor(
    @Inject(IVaccineRepository)
    private readonly vaccineRepository: IVaccineRepository,
    private readonly logger: LoggerService,
  ) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vaccine (partial)' })
  @ApiParam({ name: 'id', description: 'Vaccine id' })
  @ApiBody({ type: UpdateVaccineDto })
  @ApiResponse({ status: 200, type: VaccineResponse })
  @ApiResponse({ status: 404, description: 'Vaccine not found' })
  async execute(
    @Param('id') id: string,
    @Body() dto: UpdateVaccineDto,
  ): Promise<VaccineResponse> {
    const vaccine = await this.vaccineRepository.findById(id);
    if (!vaccine) {
      throw new DomainError(
        VaccineErrorCode.VACCINE_NOT_FOUND,
        `Vaccine ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Only the fields present in the DTO are applied (undefined = untouched).
    // name is not updatable, so it is not part of the DTO.
    vaccine.applyUpdate({
      dose: dto.dose,
      status: dto.status,
      dateGiven: dto.dateGiven,
      dueDate: dto.dueDate,
      location: dto.location,
      notes: dto.notes,
    });

    await this.vaccineRepository.save(vaccine);

    this.logger.info('Vaccine updated', { vaccineId: id });

    return VaccineResponse.from(vaccine);
  }
}
