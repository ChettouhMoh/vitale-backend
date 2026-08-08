import { Inject, Injectable } from '@nestjs/common';
import { IEventBus, IOutboxRepository } from './ports';
import { DomainEventName, DomainEventPayload } from './registry';
import { OutboxEvent, OutboxPayload } from './domain';

/**
 * EventBusService — the IEventBus implementation domain modules depend on.
 *
 * `emit` writes an outbox row and returns. It never invokes handlers: the
 * OutboxDispatcher picks the row up afterwards. This is what lets an emitter
 * record a fact durably without knowing (or waiting for) any consumer.
 */
@Injectable()
export class EventBusService implements IEventBus {
  constructor(
    @Inject(IOutboxRepository)
    private readonly outbox: IOutboxRepository,
  ) {}

  async emit<K extends DomainEventName>(
    name: K,
    payload: DomainEventPayload<K>,
  ): Promise<void> {
    const event = OutboxEvent.createNew(name, payload as OutboxPayload);

    // TODO(transactions): once a real ORM lands, the outbox row must be written
    // inside the SAME transaction as the state change that produced it. Until
    // then this is a sequential write and the atomicity guarantee is not yet
    // real — a crash between the state write and this line would lose the event.
    // A unit-of-work / transaction context will be injected here without
    // changing any caller.
    await this.outbox.save(event);
  }
}
