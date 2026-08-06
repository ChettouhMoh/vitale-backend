import { DoctorExpertise } from '../domain';

export interface IDoctorExpertiseRepository {
  save(expertise: DoctorExpertise): Promise<void>;
  findByDoctorId(doctorId: string): Promise<DoctorExpertise | null>;
}

export const IDoctorExpertiseRepository = Symbol('IDoctorExpertiseRepository');
