import { Injectable } from '@nestjs/common';
import { DoctorBio } from '@/doctor/domain';
import { IDoctorBioRepository } from '@/doctor/ports';

/** One document per doctor (keyed by doctorId). */
@Injectable()
export class InMemoryDoctorBioRepository implements IDoctorBioRepository {
  private readonly store = new Map<string, DoctorBio>();

  async save(bio: DoctorBio): Promise<void> {
    this.store.set(bio.doctorId, bio);
  }

  async findByDoctorId(doctorId: string): Promise<DoctorBio | null> {
    return this.store.get(doctorId) ?? null;
  }
}
