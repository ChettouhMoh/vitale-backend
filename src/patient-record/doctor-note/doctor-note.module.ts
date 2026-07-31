import { Module } from '@nestjs/common';
import { AddDoctorNoteController } from './use-cases/add-doctor-note/add-doctor-note.controller';
import { GetPatientNotesController } from './use-cases/get-patient-notes/get-patient-notes.controller';
import { UpdateDoctorNoteController } from './use-cases/update-doctor-note/update-doctor-note.controller';
import { DeleteDoctorNoteController } from './use-cases/delete-doctor-note/delete-doctor-note.controller';

@Module({
  controllers: [
    AddDoctorNoteController,
    GetPatientNotesController,
    UpdateDoctorNoteController,
    DeleteDoctorNoteController,
  ],
})
export class DoctorNoteModule {}
