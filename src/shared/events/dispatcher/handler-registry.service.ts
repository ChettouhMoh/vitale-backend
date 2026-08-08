import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { LoggerService } from '@/common/logger/logger.service';
import { ON_DOMAIN_EVENT_METADATA } from '../decorators';
import {
  DomainEventName,
  DomainEventPayload,
  DOMAIN_EVENT_NAMES,
} from '../registry';

type HandlerMethod = (
  payload: DomainEventPayload<DomainEventName>,
  eventId: string,
) => unknown | Promise<unknown>;

/** A single subscription discovered at bootstrap. */
export interface HandlerRef {
  readonly eventName: DomainEventName;
  /** ClassName.method — for logging only (never the payload). */
  readonly describe: string;
  invoke(payload: Record<string, unknown>, eventId: string): Promise<void>;
}

/**
 * Scans every registered provider at bootstrap for methods decorated with
 * `@OnDomainEvent` and indexes them by event name. Warns for any event in the
 * catalogue that has zero handlers — usually a wiring mistake, not intent.
 */
@Injectable()
export class HandlerRegistryService implements OnModuleInit {
  private readonly handlers = new Map<DomainEventName, HandlerRef[]>();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit(): void {
    // Idempotent: a re-scan (e.g. in tests that re-init the module) rebuilds
    // cleanly instead of double-registering handlers.
    this.handlers.clear();
    for (const wrapper of this.discovery.getProviders()) {
      const instance = wrapper.instance as Record<string, unknown> | null;
      if (!instance || typeof instance !== 'object') continue;

      const prototype = Object.getPrototypeOf(instance) as object | null;
      if (!prototype) continue;

      for (const methodName of this.scanner.getAllMethodNames(prototype)) {
        const method = instance[methodName];
        if (typeof method !== 'function') continue;

        const eventName = this.reflector.get<DomainEventName | undefined>(
          ON_DOMAIN_EVENT_METADATA,
          method,
        );
        if (!eventName) continue;

        const boundMethod = method.bind(instance) as HandlerMethod;
        const describe = `${instance.constructor?.name ?? 'Unknown'}.${methodName}`;

        const ref: HandlerRef = {
          eventName,
          describe,
          invoke: async (payload, eventId) => {
            await boundMethod(
              payload as DomainEventPayload<DomainEventName>,
              eventId,
            );
          },
        };

        const list = this.handlers.get(eventName) ?? [];
        list.push(ref);
        this.handlers.set(eventName, list);
      }
    }

    this.warnUnhandledEvents();
  }

  handlersFor(name: DomainEventName): HandlerRef[] {
    return this.handlers.get(name) ?? [];
  }

  private warnUnhandledEvents(): void {
    for (const name of DOMAIN_EVENT_NAMES) {
      if (!this.handlers.has(name)) {
        this.logger.warn('Domain event has no registered handler', {
          event: name,
        });
      }
    }
  }
}
