import { Injectable } from '@nestjs/common';
import { Vaccine } from '@/patient-record/vaccine/domain/vaccine';
import { IVaccineRepository } from '@/patient-record/vaccine/ports/vaccine.repository.interface';
import { VACCINE_SEED } from './vaccine.seed';

@Injectable()
export class InMemoryVaccineRepository implements IVaccineRepository {
  private readonly store = new Map<string, Vaccine>();

  constructor() {
    // Seed the store with the demo vaccines migrated from the dashboard mock.
    for (const record of VACCINE_SEED) {
      this.store.set(record.id, Vaccine.restoreExisting(record));
    }
  }

  async findByPatientId(patientId: string): Promise<Vaccine[]> {
    return Array.from(this.store.values()).filter(
      (v) => v.patientId === patientId,
    );
  }

  async findById(id: string): Promise<Vaccine | null> {
    return this.store.get(id) ?? null;
  }

  async save(vaccine: Vaccine): Promise<void> {
    this.store.set(vaccine.id, vaccine);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
