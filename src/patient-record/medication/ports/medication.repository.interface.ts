import { Medication } from '../domain/medication';

/**
 * IMedicationRepository — pure domain port.
 *
 * Medications are addressed globally by their own id for update/delete (the
 * client passes only the medication id), and grouped by patient for listing.
 */
export interface IMedicationRepository {
  findByPatientId(patientId: string): Promise<Medication[]>;
  findById(id: string): Promise<Medication | null>;
  save(medication: Medication): Promise<void>;
  delete(id: string): Promise<void>;
}

export const IMedicationRepository = Symbol('IMedicationRepository');
