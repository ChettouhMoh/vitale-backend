import { DoctorBio } from '../domain';

export interface IDoctorBioRepository {
  save(bio: DoctorBio): Promise<void>;
  findByDoctorId(doctorId: string): Promise<DoctorBio | null>;
}

export const IDoctorBioRepository = Symbol('IDoctorBioRepository');
