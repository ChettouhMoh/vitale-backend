import { Controller, Delete, Param, Inject, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { DoctorNoteErrorCode } from '@/common/errors/codes';
import { DomainError } from '@/common/errors/domain.error';
import { IDoctorNoteRepository } from '@/patient-record/doctor-note/ports/doctor-note.repository.interface';
import { LoggerService } from '@/common/logger/logger.service';
import { RequireRoles } from '@/auth/decorators';
import { Role } from '@/auth/domain';

@ApiTags('Doctor Notes')
@ApiCookieAuth()
@RequireRoles(Role.Doctor)
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
  @ApiResponse({ status: 403, description: 'Forbidden - not the note author' })
  async execute(
    @Param('id') id: string,
    @Req() req: { user?: { id: string } },
  ): Promise<{ success: boolean }> {
    const note = await this.noteRepository.findById(id);
    if (!note) {
      throw new DomainError(
        DoctorNoteErrorCode.NOTE_NOT_FOUND,
        `Note ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (req.user?.id !== note.doctorId) {
      throw new DomainError(
        DoctorNoteErrorCode.FORBIDDEN,
        'You can only delete your own notes',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.noteRepository.delete(id);

    this.logger.info('Doctor note deleted', { noteId: id });

    return { success: true };
  }
}
