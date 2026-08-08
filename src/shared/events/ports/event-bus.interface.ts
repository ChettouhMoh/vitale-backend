import { DomainEventName, DomainEventPayload } from '../registry';

/**
 * IEventBus — the entire public surface a domain module sees. `emit` writes an
 * outbox row and returns; it does NOT invoke handlers (a dispatcher does that,
 * after the fact). Payloads are compile-time checked against the DomainEventMap.
 */
export interface IEventBus {
  emit<K extends DomainEventName>(
    name: K,
    payload: DomainEventPayload<K>,
  ): Promise<void>;
}

export const IEventBus = Symbol('IEventBus');
