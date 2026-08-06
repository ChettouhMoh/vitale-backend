import { Injectable } from '@nestjs/common';
import { DoctorSchedule } from '@/doctor/domain';
import { IDoctorScheduleRepository } from '@/doctor/ports';

/** One document per doctor (keyed by doctorId). */
@Injectable()
export class InMemoryDoctorScheduleRepository
  implements IDoctorScheduleRepository
{
  private readonly store = new Map<string, DoctorSchedule>();

  async save(schedule: DoctorSchedule): Promise<void> {
    this.store.set(schedule.doctorId, schedule);
  }

  async findByDoctorId(doctorId: string): Promise<DoctorSchedule | null> {
    return this.store.get(doctorId) ?? null;
  }
}
