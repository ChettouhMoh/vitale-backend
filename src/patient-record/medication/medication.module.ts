import { Module } from '@nestjs/common';
import { AddMedicationController } from './use-cases/add-medication/add-medication.controller';
import { GetPatientMedicationsController } from './use-cases/get-patient-medications/get-patient-medications.controller';
import { UpdateMedicationController } from './use-cases/update-medication/update-medication.controller';
import { DeleteMedicationController } from './use-cases/delete-medication/delete-medication.controller';

@Module({
  controllers: [
    AddMedicationController,
    GetPatientMedicationsController,
    UpdateMedicationController,
    DeleteMedicationController,
  ],
})
export class MedicationModule {}
