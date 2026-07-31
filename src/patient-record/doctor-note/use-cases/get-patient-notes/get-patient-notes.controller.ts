import { Controller, Get, Param, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { DoctorNoteResponse } from './get-patient-notes.response';
import { IDoctorNoteRepository } from '@/patient-record/doctor-note/ports/doctor-note.repository.interface';

class PatientIdParam {
  @IsString()
  patientId!: string;
}

@ApiTags('Doctor Notes')
@Controller({ path: 'patients', version: '1' })
export class GetPatientNotesController {
  constructor(
    @Inject(IDoctorNoteRepository)
    private readonly noteRepository: IDoctorNoteRepository,
  ) {}

  @Get(':patientId/notes')
  @ApiOperation({ summary: "List a patient's doctor notes (newest first)" })
  @ApiParam({ name: 'patientId', description: 'Patient id' })
  @ApiResponse({ status: 200, type: [DoctorNoteResponse] })
  async execute(
    @Param() { patientId }: PatientIdParam,
  ): Promise<DoctorNoteResponse[]> {
    // Empty list when the patient has no notes — never 404 here.
    const notes = await this.noteRepository.findByPatientId(patientId);
    // Newest first (matches the dashboard's ordering).
    notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return notes.map((n) => DoctorNoteResponse.from(n));
  }
}
