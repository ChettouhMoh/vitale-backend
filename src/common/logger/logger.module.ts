import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Global so any provider can inject `LoggerService` without re-importing
 * this module everywhere.
 */
@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
