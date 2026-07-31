import { Injectable } from '@nestjs/common';
import { Medication } from '@/patient-record/medication/domain/medication';
import { IMedicationRepository } from '@/patient-record/medication/ports/medication.repository.interface';
import { MEDICATION_SEED } from './medication.seed';

@Injectable()
export class InMemoryMedicationRepository implements IMedicationRepository {
  private readonly store = new Map<string, Medication>();

  constructor() {
    // Seed the store with the demo medications migrated from the dashboard mock.
    for (const record of MEDICATION_SEED) {
      this.store.set(record.id, Medication.restoreExisting(record));
    }
  }

  async findByPatientId(patientId: string): Promise<Medication[]> {
    return Array.from(this.store.values()).filter(
      (m) => m.patientId === patientId,
    );
  }

  async findById(id: string): Promise<Medication | null> {
    return this.store.get(id) ?? null;
  }

  async save(medication: Medication): Promise<void> {
    this.store.set(medication.id, medication);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
