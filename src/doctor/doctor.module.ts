import { Module } from '@nestjs/common';
import { IAuthSubjectStore, IDoctorRegistration } from '@/auth/ports';
import { DevDoctorSeed } from './dev/seed/dev-doctor.seed';
import { DoctorAuthSubjectStore, DoctorRegistrationService } from './auth';
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
  providers: [
    // Dev-only: preloads the dashboard's mock account into the in-memory store so
    // login works locally. No-ops in production.
    DevDoctorSeed,
    // Adapters the auth context depends on (auth → doctor). Bound here so the
    // doctor module owns its aggregate-to-auth projection.
    { provide: IAuthSubjectStore, useClass: DoctorAuthSubjectStore },
    { provide: IDoctorRegistration, useClass: DoctorRegistrationService },
  ],
  exports: [IAuthSubjectStore, IDoctorRegistration],
})
export class DoctorModule {}
