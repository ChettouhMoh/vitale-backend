import {
  Controller,
  Post,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CreateDoctorDto, CreateDoctorResponse } from './create-doctor.dto';
import { Doctor } from '@/doctor/domain';
import { IDoctorRepository } from '@/doctor/ports';
import { LoggerService } from '@/common/logger/logger.service';

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class CreateDoctorController {
  constructor(
    @Inject(IDoctorRepository)
    private readonly doctors: IDoctorRepository,
    private readonly logger: LoggerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new doctor (self-signup)' })
  @ApiBody({ type: CreateDoctorDto })
  @ApiResponse({ status: 201, type: CreateDoctorResponse })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async execute(@Body() dto: CreateDoctorDto): Promise<CreateDoctorResponse> {
    // Hash with argon2id — plaintext is never stored.
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const doctor = Doctor.createNew({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone ?? null,
      specialty: dto.specialty,
    });

    // Uniqueness (email) is enforced by the repository — no pre-check query.
    // Profile sections are created lazily on first edit (each is its own
    // document); reads default to empty, so nothing to seed here.
    await this.doctors.save(doctor);

    this.logger.info('Doctor registered', { doctorId: doctor.id });

    return { id: doctor.id };
  }
}
