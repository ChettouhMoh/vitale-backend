import { Module } from '@nestjs/common';
import { CreatePatientController } from './use-cases/create-patient/create-patient.controller';
import { GetPatientController } from './use-cases/get-patient/get-patient.controller';

@Module({
  controllers: [CreatePatientController, GetPatientController],
})
export class PatientModule {}
