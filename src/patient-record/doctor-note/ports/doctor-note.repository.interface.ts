import { DoctorNote } from '../domain/doctor-note';

/**
 * IDoctorNoteRepository — pure domain port.
 *
 * Notes live in their own store (Mongo in production). Addressed globally by id
 * for update/delete, and grouped by patient for listing (newest first).
 */
export interface IDoctorNoteRepository {
  findByPatientId(patientId: string): Promise<DoctorNote[]>;
  findById(id: string): Promise<DoctorNote | null>;
  save(note: DoctorNote): Promise<void>;
  delete(id: string): Promise<void>;
}

export const IDoctorNoteRepository = Symbol('IDoctorNoteRepository');
