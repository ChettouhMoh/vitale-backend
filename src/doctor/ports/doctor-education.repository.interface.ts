import { DoctorEducation } from '../domain';

export interface IDoctorEducationRepository {
  save(education: DoctorEducation): Promise<void>;
  findByDoctorId(doctorId: string): Promise<DoctorEducation | null>;
}

export const IDoctorEducationRepository = Symbol('IDoctorEducationRepository');
