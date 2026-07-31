import { Vaccine } from '../domain/vaccine';

/**
 * IVaccineRepository — pure domain port.
 *
 * Vaccines are addressed globally by their own id for update/delete, and
 * grouped by patient for listing.
 */
export interface IVaccineRepository {
  findByPatientId(patientId: string): Promise<Vaccine[]>;
  findById(id: string): Promise<Vaccine | null>;
  save(vaccine: Vaccine): Promise<void>;
  delete(id: string): Promise<void>;
}

export const IVaccineRepository = Symbol('IVaccineRepository');
