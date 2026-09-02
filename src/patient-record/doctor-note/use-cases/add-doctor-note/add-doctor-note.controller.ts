import {
  Controller,
  Post,
  Param,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
  Req,
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
import { AddDoctorNoteDto } from './add-doctor-note.dto';
import { DoctorNoteResponse } from '../get-patient-notes/get-patient-notes.response';
import { DoctorNote } from '@/patient-record/doctor-note/domain/doctor-note';
import { IDoctorNoteRepository } from '@/patient-record/doctor-note/ports/doctor-note.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';
import { RequireRoles } from '@/auth/decorators';
import { Role } from '@/auth/domain';
import { DomainError } from '@/common/errors/domain.error';
import { DoctorNoteErrorCode } from '@/common/errors/codes';

class PatientIdParam {
  @IsString()
  patientId!: string;
}

@ApiTags('Doctor Notes')
@ApiCookieAuth()
@RequireRoles(Role.Doctor)
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
  @ApiResponse({ status: 403, description: 'Forbidden - note ownership mismatch' })
  async execute(
    @Param() { patientId }: PatientIdParam,
    @Body() dto: AddDoctorNoteDto,
    @Req() req: { user?: { id: string } },
  ): Promise<DoctorNoteResponse> {
    if (req.user?.id !== dto.doctorId) {
      throw new DomainError(
        DoctorNoteErrorCode.FORBIDDEN,
        'You can only create notes as yourself',
        HttpStatus.FORBIDDEN,
      );
    }

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
