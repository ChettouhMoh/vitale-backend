import { Module } from '@nestjs/common';
import { CreatePatientController } from './use-cases/create-patient/create-patient.controller';
import { GetPatientController } from './use-cases/get-patient/get-patient.controller';
import { UpdateAllergiesController } from './use-cases/update-allergies/update-allergies.controller';
import { UpdateChronicDiseasesController } from './use-cases/update-chronic-diseases/update-chronic-diseases.controller';

@Module({
  controllers: [
    CreatePatientController,
    GetPatientController,
    UpdateAllergiesController,
    UpdateChronicDiseasesController,
  ],
})
export class PatientModule {}
