import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@/config/config.module';
import { LoggerModule } from '@/common/logger/logger.module';
import { HealthModule } from '@/health/health.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';

@Module({
  imports: [
    // 1. Config first — validates env on boot, exposes ConfigService globally.
    ConfigModule,
    // 2. Logger next — global, so every later module can inject LoggerService.
    LoggerModule,
    // 3. Infrastructure: health checks.
    HealthModule,

    // ───────────────────────────────────────────────────────────────────
    // Domain modules will be registered below as they are built, e.g.:
    //   AuthModule,
    //   DoctorModule,
    //   PatientModule,
    //   NfcCardModule,
    // ───────────────────────────────────────────────────────────────────
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
