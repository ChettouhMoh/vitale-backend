import { IPatientRepository } from '@/patient-record/patient/ports/patient.repository.interface';
import { IMedicationRepository } from '@/patient-record/medication/ports/medication.repository.interface';
import { IVaccineRepository } from '@/patient-record/vaccine/ports/vaccine.repository.interface';
import { IDoctorNoteRepository } from '@/patient-record/doctor-note/ports/doctor-note.repository.interface';
import { Global, Module } from '@nestjs/common';
import { InMemoryPatientRepository } from './patient/in-memory-patient';
import { InMemoryMedicationRepository } from './medication/in-memory-medication';
import { InMemoryVaccineRepository } from './vaccine/in-memory-vaccine';
import { InMemoryDoctorNoteRepository } from './doctor-note/in-memory-doctor-note';

// make it globale module so we can access the repositories in any module without importing it explicitly
@Global()
@Module({
  providers: [
    // Here you would import and provide your persistence-related services
    // For example, database connections, repositories, Adapters, etc.
    { provide: IPatientRepository, useClass: InMemoryPatientRepository },
    { provide: IMedicationRepository, useClass: InMemoryMedicationRepository },
    { provide: IVaccineRepository, useClass: InMemoryVaccineRepository },
    { provide: IDoctorNoteRepository, useClass: InMemoryDoctorNoteRepository },
  ],
  exports: [
    // Export the repositories so they can be used in other modules
    IPatientRepository,
    IMedicationRepository,
    IVaccineRepository,
    IDoctorNoteRepository,
  ],
})
export class PersistenceModule {}
