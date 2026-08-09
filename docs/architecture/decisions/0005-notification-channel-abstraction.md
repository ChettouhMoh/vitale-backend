# ADR 0005 — Notification channel abstraction

## Status

Accepted — 2026-08-08.

## Context

The notification context turns domain events into delivered messages. Three
design questions had to be settled before building it: how many transport
abstractions to define, which email provider to start with, and what key
guarantees a message is not sent twice under the at-least-once delivery the
events dispatcher provides.

## Decision

Define three channel ports — `IEmailChannel`, `ISmsChannel`, `IPushChannel` —
even though only email is implemented. Start with Gmail SMTP as the email
provider behind `IEmailChannel`. Key the idempotency guard on
`(eventId, type, channel)`.

### Why three ports when only one is implemented

Vitale will send SMS (an OTP, an appointment reminder) and push (a scan alert)
eventually, and a channel is a genuine domain concept — `NotificationType`
already carries a `defaultChannel`, and `Recipient` validates that an address
matches its channel. Defining the ports now makes the abstraction real from day
one: `SendNotificationService.dispatch` already switches on the channel and
routes to the matching port, so adding a real SMS provider is implementing
`ISmsChannel` and binding it — no change to the service, the aggregate, or the
handlers.

The stubs (`ConsoleSmsChannel`, `ConsolePushChannel`) are not dead code pretending
to be features; they are the proof that the seam holds. If the ports were not
real, the first SMS requirement would force a refactor of the send path. With
them, it is an adapter swap. The cost of the two stub files is trivial next to
that.

### Why Gmail first, and what triggers the swap

Gmail SMTP needs no account setup, no domain verification, and no billing — an
App Password and you can send. For a system with no production traffic, that is
the fastest way to exercise the real send path end to end. It is explicitly a
development provider: ~500 recipients/day, aggressive throttling, and poor
deliverability, because a personal Gmail account has no SPF/DKIM alignment with
`vitale.dz`, so mail frequently lands in spam.

The swap trigger is the first of: real users receiving transactional mail (spam
placement becomes a correctness problem, not a nuisance), volume approaching the
daily cap, or the need for delivery signals (bounces, opens) that Gmail SMTP does
not provide. The replacement is a transactional provider — Resend, SES, or
Postmark — with a verified sending domain. Because it sits behind `IEmailChannel`,
the change is one new adapter and one binding line in `notification.module.ts`;
templates, the service, and the aggregate are untouched.

### Why the idempotency key is (eventId, type, channel)

`eventId` is the natural idempotency token: the events system already treats it
as such, and a redelivery of the same event carries the same id. But `eventId`
alone is too coarse — one event can legitimately produce several distinct
notifications (a future `doctor.registered` might send both a welcome email and a
welcome SMS). Keying on `eventId` alone would let the second of those look like a
duplicate of the first and be suppressed.

Adding `type` and `channel` makes the key identify *one specific message*: this
event, rendered as this notification type, on this channel. Two different
messages from the same event have different keys and both go out; a genuine
redelivery of the same message matches and is skipped. That is exactly the
granularity the guard needs.

The recipient address was deliberately **not** part of the key. The recipient is
derived from the event and does not distinguish two legitimate notifications
(they usually go to the same person), so it adds nothing to the key. Worse, it
would make idempotency depend on address normalisation quirks — a trailing space
or a case difference could make a redelivery look new and send twice, which is
the precise failure the guard exists to prevent. The key is built from stable
identifiers, not from user-supplied contact data.

## Consequences

Positive: the send path is channel-agnostic and provider-agnostic; adding SMS or
push, or replacing Gmail, is a contained adapter change; the idempotency guard is
correct at the granularity of a single message and robust to address quirks.

Negative: two stub channels exist with no consumer yet; Gmail's limits and
deliverability mean the current email path is not production-grade (named as a
gap in [notification.md](../notification.md)); and the guard depends on the
`eventId` being stable across redeliveries, which is a property owned by the
events infrastructure, not this context.

## Alternatives considered

**One generic `IMessageChannel` with a `type` field.** A single port taking a
channel discriminator. Rejected: the channels have genuinely different payloads
(email has subject/html/text; push has a device token, title, body), and a union
payload pushes per-channel validation into runtime branches instead of the type
system.

**Key idempotency on `eventId` only.** Simpler, but it cannot represent one event
producing two different messages, and would suppress legitimate second sends.

**Key idempotency on the recipient address.** Rejected as above: it is neither
necessary (doesn't distinguish messages) nor safe (couples correctness to address
normalisation).
