import { Patient } from '@/patient-record/patient/domain/patient';
import { IPatientRepository } from '@/patient-record/patient/ports/patient.repository.interface';
import { Injectable } from '@nestjs/common';
import { PATIENT_SEED } from './patient.seed';

@Injectable()
export class InMemoryPatientRepository implements IPatientRepository {
  private readonly store = new Map<string, Patient>();

  constructor() {
    // Seed the store with the demo directory migrated from the dashboard mock.
    for (const record of PATIENT_SEED) {
      this.store.set(record.id, Patient.restoreExisting(record));
    }
  }

  async save(patient: Patient): Promise<void> {
    this.store.set(patient.id, patient);
  }

  async findById(id: string): Promise<Patient | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Patient[]> {
    return Array.from(this.store.values());
  }
}
