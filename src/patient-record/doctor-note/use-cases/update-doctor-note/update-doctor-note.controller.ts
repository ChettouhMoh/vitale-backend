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
import { UpdateDoctorNoteDto } from './update-doctor-note.dto';
import { DoctorNoteResponse } from '../get-patient-notes/get-patient-notes.response';
import { DoctorNoteErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IDoctorNoteRepository } from '@/patient-record/doctor-note/ports/doctor-note.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';

@ApiTags('Doctor Notes')
@Controller({ path: 'notes', version: '1' })
export class UpdateDoctorNoteController {
  constructor(
    @Inject(IDoctorNoteRepository)
    private readonly noteRepository: IDoctorNoteRepository,
    private readonly logger: LoggerService,
  ) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update a doctor note (content only)' })
  @ApiParam({ name: 'id', description: 'Note id' })
  @ApiBody({ type: UpdateDoctorNoteDto })
  @ApiResponse({ status: 200, type: DoctorNoteResponse })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async execute(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorNoteDto,
  ): Promise<DoctorNoteResponse> {
    const note = await this.noteRepository.findById(id);
    if (!note) {
      throw new DomainError(
        DoctorNoteErrorCode.NOTE_NOT_FOUND,
        `Note ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Only note content is applied — the doctor snapshot stays as authored.
    note.applyUpdate({
      type: dto.type,
      title: dto.title,
      content: dto.content,
    });

    await this.noteRepository.save(note);

    this.logger.info('Doctor note updated', { noteId: id });

    return DoctorNoteResponse.from(note);
  }
}
