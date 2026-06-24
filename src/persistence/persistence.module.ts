import { IPatientRepository } from '@/patient/ports/patient.repository.interface';
import { Global, Module } from '@nestjs/common';
import { InMemoryPatientRepository } from './patient/in-memory-patient';

// make it globale module so we can access the repositories in any module without importing it explicitly
@Global()
@Module({
  providers: [
    // Here you would import and provide your persistence-related services
    // For example, database connections, repositories, Adapters, etc.
    { provide: IPatientRepository, useClass: InMemoryPatientRepository },
  ],
  exports: [
    // Export the repository so it can be used in other modules
    IPatientRepository,
  ],
})
export class PersistenceModule {}
