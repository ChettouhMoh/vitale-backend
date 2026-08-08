# ADR 0003 — Transactional outbox for domain events

## Status

Accepted — 2026-08-07.

## Context

Domain modules must react to each other's facts without importing each other,
and an emitter must not fail its own operation because a downstream consumer is
slow or broken. The obvious implementation — after changing state, call the
consumer (or push to a queue) — runs straight into the dual-write problem: the
operation now writes to two systems (the database and the message channel), and
there is no way to make those two writes atomic by ordering them.

Both orderings are broken.

Commit the state first, then enqueue the event: if the process crashes, or the
broker is briefly unreachable, between the commit and the enqueue, the state
change is permanent but the event is **lost forever**. A doctor exists whose
verification email was never queued, and nothing records that it should have
been — there is nothing to retry, because the intent was never written down.

Enqueue the event first, then commit the state: if the commit then fails or the
transaction rolls back, a consumer receives an event about an entity that
**does not exist**. A notification goes out for a signup that didn't happen; a
schedule is seeded for a patient that was never created.

The key point, stated plainly: atomicity across two systems cannot be achieved
by ordering them. It can only be achieved by writing both facts — the state
change and the intent to publish — to **one** system in **one** transaction.

## Decision

Use a transactional outbox. The event is written as a row to the same database
as the state change, inside the same transaction. Committing the business
operation and recording the event are therefore a single atomic act: either both
happen or neither does. There is no window in which one exists without the
other.

A separate dispatcher process reads the outbox afterwards and moves events
outward to their handlers. Handlers run **after** the emitting transaction has
committed, in a different call stack. A handler that throws causes that event to
be retried; it can never roll back or fail the operation that emitted it.

In this codebase the surface is `IEventBus.emit`, which constructs an
`OutboxEvent` and saves it (`src/shared/events/event-bus.service.ts`); the
`OutboxDispatcher` polls and delivers
(`src/shared/events/dispatcher/outbox-dispatcher.service.ts`).

## Consequences

Positive:

- No state change can occur without its event surviving. Once the transaction
  commits, the intent to publish is as durable as the change itself, and the
  dispatcher will keep trying until it succeeds or dead-letters.
- Emitters stay decoupled from consumers. `emit` names a fact and returns; it
  has no reference to any handler, so contexts do not import each other.
- A slow or failing side effect cannot fail the operation. A signup succeeds
  even if the mail server is down; the email becomes a retriable follow-up.

Negative:

- Delivery is eventually consistent. An entity can exist for a short window
  before its event has been processed — for example, a doctor row exists a few
  seconds before their verification email is queued. This is accepted
  deliberately.
- It requires a dispatcher process to move events out of the table. That is one
  more moving part than a direct call.
- Delivery is at-least-once. The dispatcher may deliver an event more than once
  (a retry re-runs handlers that already succeeded), so every handler must be
  idempotent. See [events.md](../events.md) for the handler contract.

There is a caveat specific to *this* stage of the system: persistence is
currently in-memory, so the two writes are sequential rather than truly atomic,
and the guarantee above is not yet real. The seam for a real unit-of-work is
marked with `TODO(transactions)` in `EventBusService.emit`. This is a property
of the current adapter, not of the pattern; a database-backed
`IOutboxRepository` makes it real without changing any caller.

## Alternatives considered

**Direct in-process call from the emitter.** After changing state, call the
consumer directly. Rejected: it couples the state change to the side effect and
puts the side effect's latency and failure on the critical path. Worse, a
failure that occurs after the state commit cannot be retried, because the intent
to run the side effect was never recorded anywhere.

**Enqueue directly to Redis/BullMQ from the use case.** Push the job to the
queue instead of a table. Rejected: this is the dual-write problem again. Redis
persistence (AOF) gives the queue *durability* once it has the job, but it does
nothing for *cross-system atomicity* — it cannot make durable a write it never
received, so a crash between the state commit and the enqueue still loses the
event, and an enqueue before a rolled-back commit still emits a phantom.

**Two-phase commit across the database and the broker.** A distributed
transaction spanning both systems. Rejected: the operational complexity —
coordinators, in-doubt transactions, recovery — is far beyond what this system
warrants, and many brokers do not support it well anyway. The outbox achieves
the needed guarantee with one ordinary local transaction.
