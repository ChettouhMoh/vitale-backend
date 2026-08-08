# ADR 0004 — In-process dispatch before BullMQ

## Status

Accepted — 2026-08-07. Builds on
[ADR 0003](0003-transactional-outbox.md), which established the outbox; this ADR
is only about how events are moved *out* of the outbox.

## Context

The outbox needs a dispatcher to read pending rows and invoke handlers. The
mature choice is a real queue — BullMQ on Redis — with its battle-tested retry,
backoff, and dead-letter handling. But Redis is not yet in this stack.
Persistence is in-memory, there is no production traffic, and introducing Redis
purely to move a handful of events would add a dependency and an operational
surface the system does not otherwise need right now.

## Decision

Implement the dispatcher as an in-process polling loop with hand-rolled retry,
backoff, and dead-lettering, and defer BullMQ. Keep `IEventBus` as the seam so
that the migration, when it happens, touches no domain module: emitters depend
only on `IEventBus.emit`, never on how delivery works.

Concretely today: `OutboxDispatcher` runs on an `@Interval` tick, pulls due
events with `findDue`, invokes each event's handlers with `Promise.allSettled`,
and deletes the row on full success or records a failure otherwise. Retry and
dead-letter live in the `RetrySchedule` value object and the `OutboxEvent`
aggregate. The `outbox-dispatcher.service.ts` constructor carries a `DECISION`
comment pointing here.

## Consequences

Positive:

- No Redis dependency yet. Fewer moving parts to run, deploy, and monitor.
- Fully testable without infrastructure. The integration test drives
  `dispatchDue(now)` directly, with a stubbed config and logger and the
  in-memory outbox — no broker, no timers, no containers.
- The retry, backoff, and dead-letter behaviour is explicit and readable in the
  domain, which is useful while the eventing model is still settling.

Negative:

- The retry logic is hand-rolled rather than battle-tested. It is covered by
  tests, but it is our code to get right, not a library's.
- Whole-event retry: a single failing handler re-runs its successful siblings,
  because the unit of retry is the event, not the `(event, handler)` pair. This
  is the main reason handler idempotency is mandatory.
- No operations UI. Inspecting or re-arming a dead-lettered event is a manual
  data operation (see the runbook).
- Single-process dispatch. One instance polls; there is no distribution or
  competing-consumer parallelism.

## Migration plan

When BullMQ lands, the change is contained. The public surface and the typed
catalogue do not move; the delivery mechanism underneath them is replaced.

| Component | Fate on BullMQ migration |
| --- | --- |
| `DomainEventMap` | unchanged |
| `IEventBus` / `EventBusService.emit` | unchanged — this is the seam |
| `@OnDomainEvent` decorator | unchanged |
| `HandlerRegistry` | unchanged |
| `EventName` VO | unchanged |
| `OutboxEvent` | simplified — drop `attempts`, `lastError`, `nextAttemptAt`, `deadLetteredAt`; keep `id`, `name`, `payload`, `occurredAt`, `dispatchedAt` |
| `RetrySchedule` VO | deleted — replaced by BullMQ backoff options |
| `IOutboxRepository` | trimmed — `findDue` → `findUndispatched`; drop `findDeadLettered`, `purgeDeadLetteredOlderThan` |
| `OutboxDispatcher` | rewritten as a ~20-line pump: poll → `queue.addBulk` → `markDispatched` |
| new `DomainEventsProcessor` | added — an `@Processor` that resolves and invokes the handler |
| Dispatcher integration tests | rewritten against a queue mock |

Two things make this migration clean. First, using `jobId: ${eventId}:${handlerKey}`
gives each consumer its own job, so a retry re-runs only the handler that
failed — this is precisely what removes the whole-event-retry problem noted
above. Second, BullMQ's own job state (waiting, active, failed, completed, with
attempt counts) replaces the need for any delivery-tracking columns; the outbox
shrinks to "has this event been handed to the queue yet", which is the single
`dispatchedAt` field.

## Migration triggers

Move to BullMQ when any of these becomes true:

- Redis enters the stack for another reason anyway — a session cache, or the NFC
  payload cache — so the dependency is no longer a net-new cost.
- Delayed jobs are needed for their own sake — for example, vaccine reminders
  scheduled days ahead — which a polling loop over a table serves poorly.
- The handler count grows past roughly ten and duplicate re-runs (from
  whole-event retry) start costing something measurable — real emails, real
  money, real load — rather than a log line.
