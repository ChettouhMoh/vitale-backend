import { Injectable } from '@nestjs/common';
import { DoctorLanguages } from '@/doctor/domain';
import { IDoctorLanguagesRepository } from '@/doctor/ports';

/** One document per doctor (keyed by doctorId). */
@Injectable()
export class InMemoryDoctorLanguagesRepository
  implements IDoctorLanguagesRepository
{
  private readonly store = new Map<string, DoctorLanguages>();

  async save(languages: DoctorLanguages): Promise<void> {
    this.store.set(languages.doctorId, languages);
  }

  async findByDoctorId(doctorId: string): Promise<DoctorLanguages | null> {
    return this.store.get(doctorId) ?? null;
  }
}
