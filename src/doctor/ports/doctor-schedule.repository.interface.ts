import { DoctorSchedule } from '../domain';

export interface IDoctorScheduleRepository {
  save(schedule: DoctorSchedule): Promise<void>;
  findByDoctorId(doctorId: string): Promise<DoctorSchedule | null>;
}

export const IDoctorScheduleRepository = Symbol('IDoctorScheduleRepository');
