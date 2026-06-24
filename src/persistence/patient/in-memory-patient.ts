import { Patient } from '@/patient/domain/patient';
import { IPatientRepository } from '@/patient/ports/patient.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryPatientRepository implements IPatientRepository {
  private readonly store = new Map<string, Patient>();

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
