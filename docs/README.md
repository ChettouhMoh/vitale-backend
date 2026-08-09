# Vitale backend — documentation

This folder documents cross-cutting infrastructure and the decisions behind it.
It is written for two audiences at once: engineers joining the codebase, and AI
agents receiving these files as context. Prefer reading the architecture
reference first, then the ADRs when you need to know *why* something is the way
it is.

## Index

| Document | What it covers | Who should read it |
| --- | --- | --- |
| [architecture/events.md](architecture/events.md) | The shared events infrastructure: how to emit events, write handlers, the idempotency rule, retry/dead-letter policy, configuration, and known gaps. | Anyone emitting an event, writing a handler, or debugging delivery. |
| [architecture/notification.md](architecture/notification.md) | The notification context: event → handler → service → channel flow, adding a notification type, locale/RTL handling, idempotency, Gmail SMTP setup, and known gaps. | Anyone adding a notification, editing a template, or configuring SMTP. |
| [architecture/decisions/0003-transactional-outbox.md](architecture/decisions/0003-transactional-outbox.md) | Why events go through a transactional outbox instead of a direct call or a direct queue write. | Anyone questioning the design, or extending the eventing model. |
| [architecture/decisions/0004-in-process-dispatch-before-bullmq.md](architecture/decisions/0004-in-process-dispatch-before-bullmq.md) | Why dispatch is an in-process polling loop today, and the exact plan to migrate to BullMQ later. | Anyone about to add Redis/BullMQ, or wondering why retry is hand-rolled. |
| [architecture/decisions/0005-notification-channel-abstraction.md](architecture/decisions/0005-notification-channel-abstraction.md) | Why three channel ports exist with one implemented, why Gmail is the first provider, and why the idempotency key is (eventId, type, channel). | Anyone adding a channel/provider or touching the idempotency guard. |
| [runbooks/events-troubleshooting.md](runbooks/events-troubleshooting.md) | Symptom-first operational guide for events that don't fire, run twice, get stuck, or fail tests. | On-call / whoever is debugging a live or CI problem. |

## Conventions

Three kinds of document live here, and they are maintained differently:

- **`architecture/`** is *living*. It describes how the system works right now
  and is updated in the same pull request as the code it describes. If the code
  and this folder disagree, the code is right and the doc is a bug — fix it.

- **`architecture/decisions/`** holds *ADRs* (Architecture Decision Records).
  An ADR is *immutable*: once merged it is never edited to change its meaning.
  A decision that no longer holds is not rewritten — it is superseded by a new
  ADR that references it and flips its status. Numbering is sequential; ADRs
  0001 and 0002 will be backfilled later, so this set starts at 0003.

- **`runbooks/`** is *operational*. It answers "the system is misbehaving, what
  do I do". It is kept current as failure modes are discovered.
