import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@/config/config.module';
import { LoggerModule } from '@/common/logger/logger.module';
import { HealthModule } from '@/health/health.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { PatientModule } from './patient-record/patient/patient.module';
import { MedicationModule } from './patient-record/medication/medication.module';
import { VaccineModule } from './patient-record/vaccine/vaccine.module';
import { DoctorNoteModule } from './patient-record/doctor-note/doctor-note.module';
import { AttachmentModule } from './attachment/attachment.module';
import { DoctorModule } from './doctor/doctor.module';
import { EventsModule } from './shared/events/events.module';
import { NotificationModule } from './notification/notification.module';
import { PersistenceModule } from './persistence/persistence.module';

@Module({
  imports: [
    // 1. Config first — validates env on boot, exposes ConfigService globally.
    ConfigModule,
    // 2. Logger next — global, so every later module can inject LoggerService.
    LoggerModule,
    // 3. Infrastructure: health checks.
    HealthModule,
    // 4. Persistence Layer (repositories, adapters, etc...) and It's GLobal
    PersistenceModule,
    // 5. Shared events infrastructure (transactional outbox) — global.
    EventsModule,
    // 6. Domain modules.
    PatientModule,
    MedicationModule,
    VaccineModule,
    DoctorNoteModule,
    AttachmentModule,
    DoctorModule,
    // Subscribes to domain events; imported so its handler providers exist.
    NotificationModule,
  ],
  providers: [
    // Global exception filter registered via DI so it can inject LoggerService.
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
