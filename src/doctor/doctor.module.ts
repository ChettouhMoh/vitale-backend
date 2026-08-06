import { Module } from '@nestjs/common';
import {
  CreateDoctorController,
  GetDoctorController,
  GetDoctorProfileController,
  UpdateIdentityController,
  UpdateContactController,
  UpdateCredentialsController,
  UpdateAffiliationController,
  UpdateBioController,
  UpdateExpertiseController,
  UpdateLanguagesController,
  UpdateEducationController,
  UpdateScheduleController,
  SubmitVerificationController,
  DecideVerificationController,
} from './use-cases';

@Module({
  controllers: [
    CreateDoctorController,
    GetDoctorController,
    GetDoctorProfileController,
    UpdateIdentityController,
    UpdateContactController,
    UpdateCredentialsController,
    UpdateAffiliationController,
    UpdateBioController,
    UpdateExpertiseController,
    UpdateLanguagesController,
    UpdateEducationController,
    UpdateScheduleController,
    SubmitVerificationController,
    DecideVerificationController,
  ],
})
export class DoctorModule {}
