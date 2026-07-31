import { Module } from '@nestjs/common';
import { AddVaccineController } from './use-cases/add-vaccine/add-vaccine.controller';
import { GetPatientVaccinesController } from './use-cases/get-patient-vaccines/get-patient-vaccines.controller';
import { UpdateVaccineController } from './use-cases/update-vaccine/update-vaccine.controller';
import { DeleteVaccineController } from './use-cases/delete-vaccine/delete-vaccine.controller';

@Module({
  controllers: [
    AddVaccineController,
    GetPatientVaccinesController,
    UpdateVaccineController,
    DeleteVaccineController,
  ],
})
export class VaccineModule {}
