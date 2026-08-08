import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/common/logger/logger.service';
import { OnDomainEvent } from '../decorators';
import type { DomainEventPayload } from '../registry';

/**
 * ⚠️ DEMONSTRATION ONLY — DELETE once real handlers exist.
 *
 * Proves the mechanism end to end: it subscribes to `patient.created` and logs
 * the patient id. It shows the handler contract (typed payload + event id) and
 * that a handler must be idempotent on the event id under at-least-once delivery.
 */
@Injectable()
export class LoggingEventHandler {
  constructor(private readonly logger: LoggerService) {}

  @OnDomainEvent('patient.created')
  handle(
    payload: DomainEventPayload<'patient.created'>,
    eventId: string,
  ): void {
    // A real handler would first check whether `eventId` was already processed
    // and skip if so. Logging is naturally idempotent, so nothing to dedupe here.
    this.logger.info('[events demo] patient.created received', {
      eventId,
      patientId: payload.patientId,
    });
  }
}
