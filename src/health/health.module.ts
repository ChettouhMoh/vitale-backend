import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

/**
 * Exposes `GET /health`. ConfigService is available globally (ConfigModule
 * is registered with `isGlobal: true`) so it does not need re-importing here.
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
