# Runbook — events troubleshooting

Operational guide for the shared events system. Symptom-first: find the
behaviour you are seeing, confirm it, then act. Background is in
[architecture/events.md](../architecture/events.md).

A warning before anything else: **outbox payloads contain raw one-time tokens**
— verification links and password-reset links — as well as personal data. Never
paste a payload into a ticket, a chat, or a screenshot. The system is built to
never log payloads for this reason; do not defeat that by copying them out by
hand. Work with event ids, names, and attempt counts, which are safe to share.

## Events are emitted but no handler runs

**Confirm.** You see the emit succeed (the caller returns normally) but the
handler's effect never happens. Check the logs for the dispatch line: on success
the dispatcher logs `Event dispatched` with the `eventId` and a `handlers`
count. If that line never appears, the event is not being dispatched; if it
appears with `handlers: 0`, the event has no subscriber.

**Likely causes and fixes.**

- The dispatcher is disabled. `EVENTS_DISPATCHER_ENABLED=false` makes `tick()` a
  no-op, so nothing is ever pulled from the outbox. This is the intended setting
  in tests. Set it back to `true` (the default) outside tests.
- The handler's provider is not registered in a module. The handler registry
  only scans providers Nest knows about (`DiscoveryService.getProviders()`); a
  class decorated with `@OnDomainEvent` that is not in some module's `providers`
  is invisible. Add it.
- The event name in `@OnDomainEvent(...)` does not match the name passed to
  `emit(...)`. They must be the same catalogue key. A typo means the handler
  registers under a name nothing emits.
- The dispatcher crashed on a previous tick — see "The dispatcher appears
  frozen" below.

## "no registered handler" warnings at bootstrap

**Confirm.** At startup you see one or more `Domain event has no registered
handler` warnings, each naming an event.

**What it means.** The handler registry compared `DOMAIN_EVENT_NAMES` against the
handlers it discovered and found events in the catalogue with zero subscribers.
This is a warning, not an error: those events can still be emitted, and with no
work to do they are treated as delivered and their rows deleted.

**What to do.** Usually nothing urgent — but treat it as a wiring smell. If an
event is *supposed* to have a handler, this is telling you the provider was not
registered or the name is misspelled. If an event genuinely has no consumer yet
(several do today, because the emitting modules have not been wired), the
warning is expected and can be ignored until that work lands. It is normal, for
now, to see every catalogue event except `patient.created` warned, because the
only registered handler is the demonstration `LoggingEventHandler`.

## A handler runs repeatedly for the same event

**Confirm.** The same side effect happens more than once — two emails, two
seed rows — and the duplicated deliveries share the same `eventId` in the logs.

**What it means.** This is at-least-once delivery working as designed, not a
bug in the infrastructure. When an event has several handlers and one throws,
the dispatcher retries the whole event, re-invoking the handlers that already
succeeded. It can also redeliver after a restart. The infrastructure will not
change this (until the BullMQ migration); the fix is in the handler.

**What to do.** Make the handler idempotent, keyed on `eventId`: check whether
that id was already processed and return early if so, using a unique constraint,
an upsert, or a processed-events table. The corrected pattern is in
[events.md](../architecture/events.md#the-idempotency-rule). Until the handler
is idempotent, expect duplicates whenever any sibling handler fails.

## An event is stuck and never retried (dead-lettered)

**Confirm.** A specific event stopped retrying. In the logs its last
`Event dispatch failed` line shows `deadLettered: true`, and it was logged at
`error` level rather than `warn`. The event's `attempts` has passed
`EVENTS_MAX_ATTEMPTS`.

**What it means.** The event failed more times than the maximum, so
`recordFailure` set `deadLetteredAt` and cleared `nextAttemptAt`. `findDue` no
longer returns it, so the dispatcher will not touch it again. The row and its
payload are retained for diagnosis.

**What to do.**

1. Read the `lastError` on the row to see why the handler failed, and fix the
   root cause — the downstream service, the handler bug, the bad data. Re-arming
   before fixing just marches the event back to dead-letter.
2. Re-arm it so the dispatcher will pick it up again: clear `deadLetteredAt`,
   reset `attempts` to `0`, and set `nextAttemptAt` to now. In the current
   in-memory store this is a manual mutation of the object; with a
   database-backed store it is an `UPDATE` on that row.
3. Watch the next dispatch. On success you will see `Event dispatched`; the row
   is then deleted.

Dead-lettered rows retain sensitive payloads, so they must not accumulate
forever. `IOutboxRepository.purgeDeadLetteredOlderThan(date)` exists for this and
must be scheduled in production; deleting an unrecoverable dead-lettered event
is also a valid resolution once you have captured what you need from it.

## The dispatcher appears frozen

**Confirm.** No `Event dispatched` or `Event dispatch failed` lines are being
produced even though events are being emitted and the outbox is not empty.

**Likely causes and fixes.**

- A tick threw. The tick body is wrapped in try/catch and logs
  `Outbox dispatcher tick failed` at `error` level; look for it. The catch
  ensures a crash cannot take down the app, and the next tick runs normally, so
  a one-off is self-healing — but a repeating one points at a systemic problem
  (the store is unreachable, for instance).
- A tick is genuinely stuck (a handler that never resolves). The `isRunning`
  guard means overlapping ticks are skipped, so a hung tick blocks all
  subsequent ticks. Find the handler that never settles; handlers should not
  perform unbounded waits.
- Polling is off or slow: `EVENTS_DISPATCHER_ENABLED=false`, or
  `EVENTS_POLL_INTERVAL_MS` set very high. Check the effective config.

## Tests fail with an ESM parse error on uuid

**Confirm.** A Jest run fails to parse with `SyntaxError: Unexpected token
'export'` pointing at `node_modules/uuid/dist-node/index.js`.

**What it means.** `uuid@14` ships ES modules only, and Jest does not transform
files under `node_modules` by default, so any suite that imports an aggregate
(which calls `uuidv7()`) blows up at parse time.

**What to do.** The `jest` block in `package.json` already sets
`"transformIgnorePatterns": ["node_modules/(?!uuid)"]` so `uuid` is transformed.
If this reappears, that entry has been removed or a second ESM-only dependency
has joined the aggregates — extend the negative-lookahead to include it, e.g.
`node_modules/(?!(uuid|other-esm-pkg))`.

## Inspecting outbox state

There is no admin endpoint or UI (by decision — see
[ADR 0004](../architecture/decisions/0004-in-process-dispatch-before-bullmq.md)).
Inspection is through the repository port `IOutboxRepository`:

- `findDue(limit, now)` — events waiting to be delivered at `now`.
- `findDeadLettered(limit)` — parked failures, with their `lastError` and
  `attempts`.

With the current in-memory store these are only reachable from inside the
process (a test, or a temporary diagnostic), and state is lost on restart. Once
a database-backed adapter lands, the same questions become ordinary queries
against the outbox table — which is a **sensitive** table: restrict access to
it, and never export its payloads into less-controlled systems.
