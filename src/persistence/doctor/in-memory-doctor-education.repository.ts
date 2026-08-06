import { Injectable } from '@nestjs/common';
import { DoctorEducation } from '@/doctor/domain';
import { IDoctorEducationRepository } from '@/doctor/ports';

/** One document per doctor (keyed by doctorId). */
@Injectable()
export class InMemoryDoctorEducationRepository
  implements IDoctorEducationRepository
{
  private readonly store = new Map<string, DoctorEducation>();

  async save(education: DoctorEducation): Promise<void> {
    this.store.set(education.doctorId, education);
  }

  async findByDoctorId(doctorId: string): Promise<DoctorEducation | null> {
    return this.store.get(doctorId) ?? null;
  }
}
