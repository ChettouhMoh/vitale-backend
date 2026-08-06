import { DoctorLanguages } from '../domain';

export interface IDoctorLanguagesRepository {
  save(languages: DoctorLanguages): Promise<void>;
  findByDoctorId(doctorId: string): Promise<DoctorLanguages | null>;
}

export const IDoctorLanguagesRepository = Symbol('IDoctorLanguagesRepository');
