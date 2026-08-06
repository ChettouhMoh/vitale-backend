import { Injectable } from '@nestjs/common';
import { DoctorExpertise } from '@/doctor/domain';
import { IDoctorExpertiseRepository } from '@/doctor/ports';

/** One document per doctor (keyed by doctorId). */
@Injectable()
export class InMemoryDoctorExpertiseRepository
  implements IDoctorExpertiseRepository
{
  private readonly store = new Map<string, DoctorExpertise>();

  async save(expertise: DoctorExpertise): Promise<void> {
    this.store.set(expertise.doctorId, expertise);
  }

  async findByDoctorId(doctorId: string): Promise<DoctorExpertise | null> {
    return this.store.get(doctorId) ?? null;
  }
}
