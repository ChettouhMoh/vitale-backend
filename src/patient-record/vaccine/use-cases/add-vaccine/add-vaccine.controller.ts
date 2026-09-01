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
import { AddVaccineDto } from './add-vaccine.dto';
import { VaccineResponse } from '../get-patient-vaccines/get-patient-vaccines.response';
import { Vaccine } from '@/patient-record/vaccine/domain/vaccine';
import { IVaccineRepository } from '@/patient-record/vaccine/ports/vaccine.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';

class PatientIdParam {
  @IsString()
  patientId!: string;
}

@ApiTags('Vaccines')
@ApiCookieAuth()
@Controller({ path: 'patients', version: '1' })
export class AddVaccineController {
  constructor(
    @Inject(IVaccineRepository)
    private readonly vaccineRepository: IVaccineRepository,
    private readonly logger: LoggerService,
  ) {}

  @Post(':patientId/vaccines')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add a vaccine to a patient's history" })
  @ApiParam({ name: 'patientId', description: 'Patient id' })
  @ApiBody({ type: AddVaccineDto })
  @ApiResponse({ status: 201, type: VaccineResponse })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async execute(
    @Param() { patientId }: PatientIdParam,
    @Body() dto: AddVaccineDto,
  ): Promise<VaccineResponse> {
    const vaccine = Vaccine.createNew(patientId, {
      name: dto.name,
      dose: dto.dose,
      status: dto.status,
      dateGiven: dto.dateGiven ?? null,
      dueDate: dto.dueDate,
      location: dto.location,
      notes: dto.notes ?? null,
    });

    await this.vaccineRepository.save(vaccine);

    this.logger.info('Vaccine added', { patientId, vaccineId: vaccine.id });

    return VaccineResponse.from(vaccine);
  }
}
