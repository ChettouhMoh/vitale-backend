# Notification context

The living reference for `src/notification/`. This context subscribes to domain
events and turns them into delivered messages (today: email). For the reasoning
behind the channel abstraction and the idempotency key, read
[ADR 0005](decisions/0005-notification-channel-abstraction.md). It depends on
`shared/events` (see [events.md](events.md)); nothing depends on it.

## What it does, and why it's a context not infrastructure

Domain modules emit facts and must not know how those facts reach a human.
`auth` emits `auth.password_reset_requested` and never learns whether that
became an email, an SMS, or both. This context is where that decision lives.

It is a bounded context, not plumbing, because it has genuine domain language of
its own — channel, template, locale, delivery status, recipient, provider — and
its own invariants (a sent notification is terminal; a recipient's shape must
match its channel). Infrastructure would be a dumb "send this string"; this is a
model of *how Vitale communicates transactionally*. It sits at `src/notification/`
as a sibling of `doctor` and `patient-record`.

## The flow, end to end

An event is emitted somewhere; the events dispatcher later invokes a handler
here; the handler funnels into one service; the service renders a template and
hands it to a channel adapter; a `Notification` record tracks the outcome.

```
  (some module)          shared/events                 notification context
       │                      │                                │
  IEventBus.emit ─▶ outbox ─▶ OutboxDispatcher ─▶ @OnDomainEvent handler
                                                          │ (thin adapter)
                                                          ▼
                                            SendNotificationService.send
                                              │ 1 idempotency guard (skip if sent)
                                              │ 2 resolve type/channel/locale/recipient
                                              │ 3 render template  ─▶ ITemplateRenderer
                                              │ 4 save PENDING record
                                              │ 5 dispatch          ─▶ IEmailChannel (nodemailer)
                                              ▼ 6 markSent + save  |  recordFailure + save + rethrow
                                        INotificationRepository
```

Handlers (`handlers/auth-notification.handlers.ts`,
`handlers/doctor-notification.handlers.ts`) hold no sending logic — each just
maps an event to a `send(...)` call. All the work is in
`application/send-notification.service.ts`.

## How to add a new notification type

Four edits, no new wiring:

1. Add a value to `NotificationTypeValue` in
   `domain/value-objects/notification-type.vo.ts`.
2. Add its row to the `CATALOGUE` constant in the same file — a `templateName`
   (matching the `.hbs` filename) and a `defaultChannel`.
3. Add three `.hbs` files, one per locale: `templates/fr/<name>.hbs`,
   `templates/ar/<name>.hbs`, `templates/en/<name>.hbs`. The first line is
   `subject: …`; the rest is the HTML body.
4. Add one `@OnDomainEvent(...)` handler method that calls `sender.send({ … })`
   with the new type.

The renderer discovers `.hbs` files by scanning the locale folders at boot, so
there is no registry to update — a new template is picked up automatically.

## Locale handling and the RTL rule

`Locale` (`domain/value-objects/locale.vo.ts`) accepts `fr | ar | en` and
defaults to **French** — the most common language for Algerian medical
professionals. Unlike the other VOs, `Locale.create` never throws: a missing or
unknown locale falls back to `fr` and sets `fellBackToDefault`, which
`SendNotificationService` logs as a warning. A bad locale in a payload must never
block a password reset.

Arabic is right-to-left. `Locale.isRtl` is true only for `ar`, and the renderer
uses it to pick `templates/layouts/base.rtl.hbs` (which sets `dir="rtl"` and
`text-align:right`) instead of `base.ltr.hbs`. The per-type templates are the
same shape across locales; only the layout and the copy differ.

A missing template, in contrast, **throws** `TEMPLATE_NOT_FOUND`. The renderer
never silently falls back to another locale, because a missing translation is a
bug — and unknown locale *strings* are already handled by the VO's fallback, so
by the time the renderer runs the locale is always one of the three.

## Idempotency and at-least-once delivery

The events dispatcher delivers at-least-once: a handler can run more than once
for the same event (a retry re-runs handlers that already succeeded). Without a
guard, a redelivered `password_reset_requested` would send two emails.

The guard is step 1 of `SendNotificationService.send`: it calls
`findByEventAndType(eventId, type, channel)` and, if a record already exists and
`isSent`, returns immediately (a debug log, no throw, no second send). The key is
`(eventId, type, channel)` — see
[ADR 0005](decisions/0005-notification-channel-abstraction.md) for why that
triple and not the recipient address. This makes redelivery safe: the first
delivery records a sent notification, and every subsequent one for the same
event short-circuits.

Two supporting choices reinforce this. The record is saved **pending before the
send**, so a crash mid-send leaves a `pending` row (visible, retriable) rather
than no trace. And handlers never catch — on failure the service rethrows, the
dispatcher retries, and the guard prevents the retry from re-sending a message
that had actually gone out.

## Gmail SMTP setup

The email channel (`infra/nodemailer-email.channel.ts`) uses Gmail SMTP for
development. Gmail blocks basic auth, so you need an **App Password**, not your
account password:

1. Enable 2-Step Verification on the Google account.
2. Google Account → Security → App passwords → generate one for "Mail".
3. Put the 16-character value (no spaces) in `SMTP_PASSWORD`.

Then fill `.env` from `.env.example`: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`,
`SMTP_SECURE=true`, `SMTP_USER` and `MAIL_FROM_ADDRESS` set to the Gmail address,
and `NOTIFICATIONS_ENABLED=true`. With `NOTIFICATIONS_ENABLED=false` the adapter
logs instead of sending, but the `Notification` record is still created — the
kill-switch is in the adapter, not the service, so the full path is exercised
locally. On boot the adapter runs `transport.verify()` and logs whether the
credentials are valid, so a wrong App Password is visible at startup rather than
on the first password reset.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `SMTP_HOST` | — (required) | SMTP server host. |
| `SMTP_PORT` | `465` | SMTP port. |
| `SMTP_SECURE` | `true` | TLS on connect. |
| `SMTP_USER` | — (required) | SMTP username (the Gmail address). |
| `SMTP_PASSWORD` | — (required) | SMTP password (Gmail App Password). |
| `MAIL_FROM_NAME` | `Vitale` | Display name on the From header. |
| `MAIL_FROM_ADDRESS` | — (required) | From address. |
| `NOTIFICATIONS_ENABLED` | `true` | When false, the adapter logs instead of sending. |

## Testing

Suites are colocated `*.spec.ts` and need no live SMTP — the integration test
uses a fake email channel and the in-memory outbox, and drives the dispatcher
directly.

```bash
npx jest notification    # this context
yarn test                # the whole unit suite
```

Coverage: `locale.vo.spec` (fallback + RTL), `delivery-status.vo.spec`
(transitions + terminal `sent`), `notification.spec` (lifecycle, double-send,
error truncation, no-body-persisted), `handlebars-template-renderer.spec`
(subject/body split, RTL layout selection, `TEMPLATE_NOT_FOUND`, plaintext
derivation), `send-notification.service.spec` (idempotency skip, save-before-send,
failure rethrow), and `notification-handlers.integration.spec` (all seven events
emitted through the real bus reach a sent notification).

## Known gaps

Stated plainly:

- **Gmail is development-only.** ~500 recipients/day, aggressive throttling, and
  poor deliverability because a personal Gmail account has no SPF/DKIM alignment
  with `vitale.dz` — mail frequently lands in spam. Production needs a
  transactional provider (Resend, SES, Postmark) with a verified sending domain.
  The header comment in `nodemailer-email.channel.ts` says the same.
- **SMS and push are stubs.** `ConsoleSmsChannel` and `ConsolePushChannel` log
  and return a synthetic id. They exist to prove the ports are real; no handler
  routes to them today (every notification type defaults to email).
- **Retry is owned by the events dispatcher, not this context.** There is no
  notification-side retry queue. A permanently failing address makes the handler
  throw, the event retries on the dispatcher's schedule, and eventually the
  *event* dead-letters — the failure surfaces as a dead-lettered outbox row (see
  the events runbook), not as a queryable notification-side backlog. The
  `Notification` record for that attempt is left `failed` with its `lastError`.
