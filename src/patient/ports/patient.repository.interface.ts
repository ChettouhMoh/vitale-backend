import { Patient } from '../domain/patient';

/**
 * IPatientRepository — pure domain port.
 *
 * The persistence layer implements this interface and maps
 * ORM-specific errors (unique violations, not-found) to domain
 * errors before they cross back into the domain.
 */
export interface IPatientRepository {
  save(patient: Patient): Promise<void>;
  findById(id: string): Promise<Patient | null>;
  findAll(): Promise<Patient[]>;
}

export const IPatientRepository = Symbol('IPatientRepository');
