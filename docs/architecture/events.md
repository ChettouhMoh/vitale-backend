# Shared events infrastructure

This is the living reference for the in-process domain-events system that lives
under `src/shared/events/`. It explains how to emit an event, how to consume
one, the rules a handler must obey, and what is not yet guaranteed. For the
reasoning behind the design, read
[ADR 0003](decisions/0003-transactional-outbox.md) (why an outbox) and
[ADR 0004](decisions/0004-in-process-dispatch-before-bullmq.md) (why in-process
dispatch for now).

## What this solves

Domain modules need to react to each other's facts without depending on each
other. When a doctor finishes signup, the `auth` context knows a verification
email should be sent — but `auth` must not import the notification code, and it
must not fail signup because an SMTP server is slow. When a patient is created,
some other context may want to seed a vaccine schedule — but `patient` must not
know that context exists.

The events system is the seam. An emitter records a *fact* ("a doctor
registered") and returns. Consumers subscribe to that fact and run later, in a
separate call stack. The emitter never learns who — if anyone — is listening.
Concretely: `auth` emits `auth.email_verification_requested`; a future
notification handler reacts to it; neither module imports the other. The only
shared surface is the typed event catalogue.

## The flow, end to end

`emit()` writes one row to the outbox and returns. A background dispatcher polls
the outbox, invokes the subscribed handlers, and — only if all of them
succeed — deletes the row. Nothing about delivery happens inside the caller's
request.

```
  caller's request                          dispatcher (every EVENTS_POLL_INTERVAL_MS)
        │                                                   │
        ▼                                                   ▼
  IEventBus.emit(name, payload)                   OutboxDispatcher.tick()
        │                                                   │
        │ OutboxEvent.createNew(...)                        │ findDue(batch, now)
        ▼                                                   ▼
  ┌───────────────────────┐   save()          ┌─────────────────────────┐
  │  outbox (OutboxEvent   │◀─────────────────▶│  pull due, unpublished  │
  │  rows: id, name,       │                   │  events, oldest first   │
  │  payload, attempts …)  │                   └────────────┬────────────┘
  └───────────────────────┘                                 │ resolve handlers
        ▲                                                    ▼
        │ returns immediately              Promise.allSettled([ h1(payload,id), h2(…) ])
        │                                                    │
   caller continues                        ┌────────────────┴─────────────────┐
   (commit, respond)                       │                                  │
                                    all fulfilled                        any rejected
                                           │                                  │
                                 markPublished() + delete row     recordFailure() + save
                                 (gone; no audit trail here)      (retry later, or dead-letter)
```

The pieces, by file:

- `event-bus.service.ts` — `EventBusService.emit`, the only surface domain code
  touches. It builds an `OutboxEvent` and saves it.
- `domain/outbox-event.ts` — the `OutboxEvent` aggregate and its lifecycle.
- `dispatcher/outbox-dispatcher.service.ts` — the polling loop and delivery.
- `dispatcher/handler-registry.service.ts` — scans providers at bootstrap for
  `@OnDomainEvent` methods.
- `registry/domain-event-map.ts` — the typed catalogue of every event.
- `persistence/events/in-memory-outbox.repository.ts` — the current store.

## How to emit an event

Inject `IEventBus` by its `Symbol` token and call `emit`. The event name and
payload are checked against `DomainEventMap` at compile time, so a wrong-shaped
payload is a type error, not a runtime surprise. `IEventBus` is exported from a
`@Global()` module, so no import of `EventsModule` is needed.

The port (`src/shared/events/ports/event-bus.interface.ts`):

```ts
export interface IEventBus {
  emit<K extends DomainEventName>(
    name: K,
    payload: DomainEventPayload<K>,
  ): Promise<void>;
}
export const IEventBus = Symbol('IEventBus');
```

Using it from a use-case, with `patient.created` (already in the catalogue):

```ts
constructor(
  @Inject(IEventBus) private readonly events: IEventBus,
) {}

// after the patient has been persisted:
await this.events.emit('patient.created', {
  patientId: patient.id,
  registeredByDoctorId: null,
});
```

`emit` returns as soon as the row is written. It does **not** invoke handlers,
and it does not wait for them. See the transaction gap below for what "written"
does and does not currently guarantee.

## How to add a new event type

The catalogue in `src/shared/events/registry/domain-event-map.ts` is the single
source of truth. Adding an event is three steps:

1. Add a key and its payload to `DomainEventMap`. Payloads are
   JSON-serialisable primitives only (see payload rules below).
2. Add the string to the runtime `DOMAIN_EVENT_NAMES` list. This list exists
   because the type system cannot enumerate an interface's keys at runtime, and
   it is guarded so it can never drift from the map:

   ```ts
   export const DOMAIN_EVENT_NAMES = [
     'auth.email_verification_requested',
     // …
     'card.scanned',
   ] as const satisfies readonly DomainEventName[];

   // If a new event is added to the map but not to the list, this stops compiling:
   type _ExhaustiveCheck = Exclude<
     DomainEventName,
     (typeof DOMAIN_EVENT_NAMES)[number]
   >;
   const _exhaustive: _ExhaustiveCheck extends never ? true : never = true;
   ```

3. Write at least one handler. If an event has zero handlers, the handler
   registry logs a `warn` at bootstrap — `"Domain event has no registered
   handler"` with the event name — because that is almost always a wiring
   mistake rather than intent. It is not an error; the event will still be
   emitted and (having no work to do) treated as delivered.

Event names must match `<context>.<fact>` in snake_case; the `EventName` value
object rejects anything else before it can be persisted.

## How to write a handler

A handler is a method on an `@Injectable()` provider, decorated with
`@OnDomainEvent(name)`. It receives the typed payload and the **event id**. The
provider must be registered in a module so Nest's `DiscoveryService` can find it
at bootstrap — the registry only sees registered providers.

The demonstration handler (`src/shared/events/__example__/logging-event-handler.ts`),
which is wired into `EventsModule` and will be deleted once real handlers exist:

```ts
@Injectable()
export class LoggingEventHandler {
  constructor(private readonly logger: LoggerService) {}

  @OnDomainEvent('patient.created')
  handle(
    payload: DomainEventPayload<'patient.created'>,
    eventId: string,
  ): void {
    this.logger.info('[events demo] patient.created received', {
      eventId,
      patientId: payload.patientId,
    });
  }
}
```

The second argument, `eventId`, is not decoration — it is the idempotency key.

## The idempotency rule

**Delivery is at-least-once. A handler may run more than once for the same
event.** This is not a rare edge case you can ignore; it is load-bearing. When
an event has several handlers and one of them throws, the dispatcher retries the
*whole* event, which re-invokes the handlers that already succeeded (see
"Whole-event retry" under Known gaps). So a handler that is not idempotent will
double-send emails, double-charge, or double-seed the moment any sibling
handler has a bad day.

The contract: use `eventId` to make repeated delivery a no-op. Record that you
processed an id, and skip if you have seen it before.

Wrong — sends twice if the event is redelivered:

```ts
@OnDomainEvent('doctor.registered')
async handle(payload: DomainEventPayload<'doctor.registered'>): Promise<void> {
  await this.mailer.sendVerification(payload.email);
}
```

Corrected — the id gates the side effect:

```ts
@OnDomainEvent('doctor.registered')
async handle(
  payload: DomainEventPayload<'doctor.registered'>,
  eventId: string,
): Promise<void> {
  if (await this.processed.has(eventId)) return; // already handled this delivery
  await this.mailer.sendVerification(payload.email);
  await this.processed.add(eventId);
}
```

The `processed` store is illustrative; a real handler uses a unique constraint,
an upsert, or a dedicated processed-events table keyed on `eventId`.

## Payload rules

A payload must be pure JSON: plain objects and arrays of `string`, `number`,
`boolean`, or `null`. `OutboxEvent.createNew` actively rejects anything else
(`Date`, class instances, functions, `undefined`, non-finite numbers) with
`EVENT_PAYLOAD_NOT_SERIALISABLE`, because the payload is persisted and may later
cross a process boundary — a `Date` would silently serialise to a string and
lose its type.

Payloads carry **ids and facts, never entity objects**. By the time a handler
runs — seconds later, or hours later after retries — the entity may have
changed. A snapshot embedded in the payload would be stale. Passing
`doctorId` forces the handler to load the current aggregate from its own
repository, so it always acts on fresh state. Dates in payloads are ISO
strings, as `expiresAt` and `scannedAt` are in the catalogue.

## Retry and dead-letter policy

Retry lives in the `RetrySchedule` value object
(`src/shared/events/domain/value-objects/retry-schedule.vo.ts`). Backoff is
exponential off a 2-second base with ±20% jitter to avoid a thundering herd:
roughly 2s, 4s, 8s, 16s, 32s for attempts one through five. `nextAttemptAfter`
returns `null` once the attempt count exceeds the maximum
(`EVENTS_MAX_ATTEMPTS`, default 5); the aggregate reads that null as "stop
trying".

On each failed dispatch the event's `recordFailure` increments `attempts`,
stores a truncated `lastError` (max 500 chars), and either schedules
`nextAttemptAt` or — when attempts exceed the max — sets `deadLetteredAt` and
clears `nextAttemptAt`. A dead-lettered event is no longer polled by `findDue`;
it is parked, with its payload retained, for a human to look at.

To re-arm a dead-lettered event an operator resets its retry state so the
dispatcher will pick it up again: clear `deadLetteredAt`, reset `attempts` to 0,
and set `nextAttemptAt` to now. In the in-memory store today that is a manual
mutation of the row; with a database-backed store it is an `UPDATE`. Do this
only after fixing whatever made the handler fail — re-arming a broken handler
just walks it back to the dead-letter state. The runbook has the step-by-step.

## Configuration

Validated in `src/config/config.module.ts` (Joi, on boot).

| Variable | Default | Purpose |
| --- | --- | --- |
| `EVENTS_POLL_INTERVAL_MS` | `1000` | How often the dispatcher polls for due events. Read from the environment at module load because `@Interval` needs a compile-time constant. |
| `EVENTS_BATCH_SIZE` | `20` | Maximum events `findDue` returns per tick. |
| `EVENTS_MAX_ATTEMPTS` | `5` | Failures allowed before an event is dead-lettered. |
| `EVENTS_DISPATCHER_ENABLED` | `true` | When `false`, `tick()` is a no-op. Used to disable polling in tests (which drive `dispatchDue()` directly). |

## Known gaps

Two things are deliberately not yet true. Neither is hidden.

**The transaction seam.** Persistence is in-memory, so the outbox write and the
state change that produced it are two *sequential* writes, not one atomic one.
The core outbox guarantee — that an event row is written in the same transaction
as the state change — is therefore **not yet real**: a crash between the state
write and `emit`'s `save` would lose the event. The seam where a real
unit-of-work will be injected is marked in `EventBusService.emit` with a
`TODO(transactions)` comment, and `emit`'s callers will not change when it lands.
Full reasoning in [ADR 0003](decisions/0003-transactional-outbox.md).

**Whole-event retry.** When an event has multiple handlers and one fails, the
dispatcher retries the whole event, re-running the handlers that already
succeeded. This is why idempotency is mandatory, not optional. It goes away with
the BullMQ migration, which gives each `(event, handler)` pair its own job and
its own retry; until then, idempotent handlers are the only mitigation. Full
reasoning and the migration plan in
[ADR 0004](decisions/0004-in-process-dispatch-before-bullmq.md).

## Testing

The suites live beside the code as `*.spec.ts` under `src/shared/events/` and
need no database or environment — the integration test stubs `ConfigService`
and `LoggerService`, uses the in-memory outbox, and drives the dispatcher by
calling `dispatchDue(now)` directly, so there are no real timers.

```bash
npx jest shared/events   # just this subsystem
yarn test                # the whole unit suite
yarn test:cov            # with coverage
```

What each suite covers:

- `domain/value-objects/event-name.vo.spec.ts` — valid `<context>.<fact>` names
  are accepted; malformed names throw `INVALID_EVENT_NAME`.
- `domain/value-objects/retry-schedule.vo.spec.ts` — delays stay inside the
  ±20% jitter band for attempts 1..max; `null` past the max.
- `domain/outbox-event.spec.ts` — lifecycle (`createNew`, `markPublished`,
  double-publish guard), payload-serialisability rejections, and the
  dead-letter transition.
- `dispatcher/outbox-dispatcher.integration.spec.ts` — emit → deliver → delete;
  retain-and-retry on failure; at-least-once re-invocation with the same
  `eventId`; dead-lettering; and the "no registered handler" bootstrap warning.

One Jest note: `uuid@14` ships ESM only, and Jest ignores `node_modules` for
transforms by default, so any suite that touches an aggregate (which calls
`uuidv7()`) fails to parse until you allow it through. The `jest` block in
`package.json` sets `"transformIgnorePatterns": ["node_modules/(?!uuid)"]` for
exactly this reason.
