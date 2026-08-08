import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { IEventBus } from './ports';
import { EventBusService } from './event-bus.service';
import {
  HandlerRegistryService,
  OutboxDispatcherService,
} from './dispatcher';
import { LoggingEventHandler } from './__example__/logging-event-handler';

/**
 * Shared events infrastructure. `@Global` so any domain module can inject
 * `IEventBus` without importing this module.
 *
 * Only `IEventBus` is exported — the outbox repository (from PersistenceModule),
 * dispatcher, and handler registry stay internal.
 */
@Global()
@Module({
  imports: [
    // Lets the handler registry scan providers for @OnDomainEvent methods.
    DiscoveryModule,
    // Drives the dispatcher's @Interval polling loop.
    ScheduleModule.forRoot(),
  ],
  providers: [
    { provide: IEventBus, useClass: EventBusService },
    HandlerRegistryService,
    OutboxDispatcherService,
    // DEMONSTRATION handler — delete once real handlers exist.
    LoggingEventHandler,
  ],
  exports: [IEventBus],
})
export class EventsModule {}
