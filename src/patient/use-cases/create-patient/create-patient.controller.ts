import {
  Controller,
  Post,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CreatePatientDto } from './create-patient.dto';
import { Patient } from '@/patient/domain/patient';
import { IPatientRepository } from '@/patient/ports/patient.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';

@ApiTags('Patients')
@Controller({ path: 'patients', version: '1' })
export class CreatePatientController {
  constructor(
    @Inject(IPatientRepository)
    private readonly patientRepository: IPatientRepository,
    private readonly logger: LoggerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new patient' })
  @ApiBody({ type: CreatePatientDto })
  @ApiResponse({ status: 201, description: 'Patient registered successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation or domain rule violation',
  })
  @ApiResponse({ status: 409, description: 'NIN already registered' })
  async execute(@Body() dto: CreatePatientDto): Promise<{ id: string }> {
    const patient = Patient.createNew({
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      bloodType: dto.bloodType,
      nationalIdNumber: dto.nationalIdNumber ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      allergies: dto.allergies ?? [],
      chronicDiseases: dto.chronicDiseases ?? [],
      emergencyContact: {
        name: dto.emergencyContact.name,
        phone: dto.emergencyContact.phone,
      },
    });

    // Unique constraint (NIN) is enforced at the DB level.
    // The persistence layer catches the ORM-specific error and maps it to
    // DomainError(NIN_ALREADY_REGISTERED) before it reaches here.
    await this.patientRepository.save(patient);

    this.logger.info('Patient registered', {
      patientId: patient.id,
      nin: patient.maskedNin, // never log raw NIN
    });

    return { id: patient.id };
  }
}
