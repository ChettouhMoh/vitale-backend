import { Controller, Delete, Param, Inject, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DoctorNoteErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IDoctorNoteRepository } from '@/patient-record/doctor-note/ports/doctor-note.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';

@ApiTags('Doctor Notes')
@Controller({ path: 'notes', version: '1' })
export class DeleteDoctorNoteController {
  constructor(
    @Inject(IDoctorNoteRepository)
    private readonly noteRepository: IDoctorNoteRepository,
    private readonly logger: LoggerService,
  ) {}

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a doctor note' })
  @ApiParam({ name: 'id', description: 'Note id' })
  @ApiResponse({ status: 200, description: 'Note deleted' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async execute(@Param('id') id: string): Promise<{ success: boolean }> {
    const note = await this.noteRepository.findById(id);
    if (!note) {
      throw new DomainError(
        DoctorNoteErrorCode.NOTE_NOT_FOUND,
        `Note ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.noteRepository.delete(id);

    this.logger.info('Doctor note deleted', { noteId: id });

    return { success: true };
  }
}
