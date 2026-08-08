import { SetMetadata } from '@nestjs/common';
import { DomainEventName } from '../registry';

export const ON_DOMAIN_EVENT_METADATA = 'vitale:on_domain_event';

/**
 * Subscribe a provider method to a domain event.
 *
 * The method receives the typed payload and the **event id**:
 *
 * ```ts
 * @OnDomainEvent('patient.created')
 * async handle(payload: DomainEventPayload<'patient.created'>, eventId: string) { … }
 * ```
 *
 * ⚠️ Delivery is **at-least-once**. A retry re-invokes handlers that already
 * succeeded, so a handler MUST be idempotent, keyed on `eventId`: record the id
 * after doing its work and skip if it has seen that id before. Never assume a
 * handler runs exactly once.
 */
export function OnDomainEvent<K extends DomainEventName>(
  name: K,
): MethodDecorator {
  return SetMetadata(ON_DOMAIN_EVENT_METADATA, name);
}
