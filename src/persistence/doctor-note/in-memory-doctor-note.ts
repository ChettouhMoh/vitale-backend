import { Injectable } from '@nestjs/common';
import { DoctorNote } from '@/patient-record/doctor-note/domain/doctor-note';
import { IDoctorNoteRepository } from '@/patient-record/doctor-note/ports/doctor-note.repository.interface';
import { DOCTOR_NOTE_SEED } from './doctor-note.seed';

/**
 * In-memory stand-in for the notes store (Mongo in production). Same port, so
 * swapping in a real Mongo adapter later touches nothing outside this file.
 */
@Injectable()
export class InMemoryDoctorNoteRepository implements IDoctorNoteRepository {
  private readonly store = new Map<string, DoctorNote>();

  constructor() {
    for (const record of DOCTOR_NOTE_SEED) {
      this.store.set(record.id, DoctorNote.restoreExisting(record));
    }
  }

  async findByPatientId(patientId: string): Promise<DoctorNote[]> {
    return Array.from(this.store.values()).filter(
      (n) => n.patientId === patientId,
    );
  }

  async findById(id: string): Promise<DoctorNote | null> {
    return this.store.get(id) ?? null;
  }

  async save(note: DoctorNote): Promise<void> {
    this.store.set(note.id, note);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
