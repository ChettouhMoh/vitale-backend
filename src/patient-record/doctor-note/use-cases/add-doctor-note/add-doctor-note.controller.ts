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
} from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AddDoctorNoteDto } from './add-doctor-note.dto';
import { DoctorNoteResponse } from '../get-patient-notes/get-patient-notes.response';
import { DoctorNote } from '@/patient-record/doctor-note/domain/doctor-note';
import { IDoctorNoteRepository } from '@/patient-record/doctor-note/ports/doctor-note.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';

class PatientIdParam {
  @IsString()
  patientId!: string;
}

@ApiTags('Doctor Notes')
@Controller({ path: 'patients', version: '1' })
export class AddDoctorNoteController {
  constructor(
    @Inject(IDoctorNoteRepository)
    private readonly noteRepository: IDoctorNoteRepository,
    private readonly logger: LoggerService,
  ) {}

  @Post(':patientId/notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add a doctor note to a patient's record" })
  @ApiParam({ name: 'patientId', description: 'Patient id' })
  @ApiBody({ type: AddDoctorNoteDto })
  @ApiResponse({ status: 201, type: DoctorNoteResponse })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async execute(
    @Param() { patientId }: PatientIdParam,
    @Body() dto: AddDoctorNoteDto,
  ): Promise<DoctorNoteResponse> {
    const note = DoctorNote.createNew(patientId, {
      doctorId: dto.doctorId,
      doctorName: dto.doctorName,
      specialty: dto.specialty,
      doctorAvatar: dto.doctorAvatar,
      type: dto.type,
      title: dto.title,
      content: dto.content,
    });

    await this.noteRepository.save(note);

    this.logger.info('Doctor note added', {
      patientId,
      noteId: note.id,
      doctorId: note.doctorId,
    });

    return DoctorNoteResponse.from(note);
  }
}
