import { describe, expect, it } from '@jest/globals';
import { EventsErrorCode } from '@/common/errors/codes/events.errors';
import { OutboxEvent } from './outbox-event';
import { RetrySchedule } from './value-objects';
import { DomainError } from '@/common/errors/domain.error';

const validPayload = { patientId: 'p1', registeredByDoctorId: null };

describe('OutboxEvent', () => {
  describe('createNew', () => {
    it('is unpublished, due now, with zero attempts and a generated id', () => {
      const before = Date.now();
      const event = OutboxEvent.createNew('patient.created', validPayload);

      expect(event.id).toEqual(expect.any(String));
      expect(event.name).toBe('patient.created');
      expect(event.payload).toEqual(validPayload);
      expect(event.attempts).toBe(0);
      expect(event.isPublished).toBe(false);
      expect(event.isDeadLettered).toBe(false);
      expect(event.nextAttemptAt).not.toBeNull();
      expect((event.nextAttemptAt as Date).getTime()).toBeGreaterThanOrEqual(
        before,
      );
      expect(event.isDue(new Date())).toBe(true);
    });

    it('rejects a malformed event name', () => {
      expect(() => OutboxEvent.createNew('Bad Name', validPayload)).toThrow(
        DomainError,
      );
    });

    it.each([
      ['a Date instance', { when: new Date() }],
      ['a function', { fn: () => 1 }],
      ['a class instance', { vo: RetrySchedule.default() }],
      ['undefined', { u: undefined }],
      ['a non-finite number', { n: Number.POSITIVE_INFINITY }],
      ['a nested Date', { nested: { deep: [{ d: new Date() }] } }],
    ])('rejects a non-JSON-serialisable payload (%s)', (_label, payload) => {
      try {
        OutboxEvent.createNew('patient.created', payload as never);
        throw new Error('expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(DomainError);
        expect((err as DomainError).code).toBe(
          EventsErrorCode.EVENT_PAYLOAD_NOT_SERIALISABLE,
        );
      }
    });

    it('accepts nested plain objects and arrays of primitives', () => {
      expect(() =>
        OutboxEvent.createNew('patient.created', {
          a: 'x',
          b: 1,
          c: true,
          d: null,
          e: [1, 'two', false, { f: 'g' }],
        }),
      ).not.toThrow();
    });
  });

  describe('markPublished', () => {
    it('sets publishedAt and clears nextAttemptAt', () => {
      const event = OutboxEvent.createNew('patient.created', validPayload);
      event.markPublished();
      expect(event.isPublished).toBe(true);
      expect(event.publishedAt).not.toBeNull();
      expect(event.nextAttemptAt).toBeNull();
      expect(event.isDue(new Date())).toBe(false);
    });

    it('throws if already published', () => {
      const event = OutboxEvent.createNew('patient.created', validPayload);
      event.markPublished();
      try {
        event.markPublished();
        throw new Error('expected to throw');
      } catch (err) {
        expect((err as DomainError).code).toBe(
          EventsErrorCode.EVENT_ALREADY_PUBLISHED,
        );
      }
    });
  });

  describe('recordFailure', () => {
    it('increments attempts, truncates the error to 500 chars, schedules a retry', () => {
      const event = OutboxEvent.createNew('patient.created', validPayload);
      const longError = 'x'.repeat(1000);

      event.recordFailure(longError, RetrySchedule.create(5, 2));

      expect(event.attempts).toBe(1);
      expect(event.lastError).toHaveLength(500);
      expect(event.nextAttemptAt).not.toBeNull();
      expect(event.isDeadLettered).toBe(false);
    });

    it('dead-letters once attempts exceed the maximum, clearing nextAttemptAt', () => {
      const event = OutboxEvent.createNew('patient.created', validPayload);
      const schedule = RetrySchedule.create(2, 2); // max 2

      event.recordFailure('boom', schedule); // attempts 1 → retry
      expect(event.isDeadLettered).toBe(false);
      event.recordFailure('boom', schedule); // attempts 2 → retry
      expect(event.isDeadLettered).toBe(false);
      event.recordFailure('boom', schedule); // attempts 3 → exceeds max → dead-letter

      expect(event.attempts).toBe(3);
      expect(event.isDeadLettered).toBe(true);
      expect(event.deadLetteredAt).not.toBeNull();
      expect(event.nextAttemptAt).toBeNull();
      expect(event.isDue(new Date())).toBe(false);
    });
  });

  describe('isDue', () => {
    it('is false when the next attempt is in the future', () => {
      const event = OutboxEvent.createNew('patient.created', validPayload);
      event.recordFailure('boom', RetrySchedule.create(5, 2)); // ~2s out
      expect(event.isDue(new Date())).toBe(false);
      expect(event.isDue(new Date(Date.now() + 60_000))).toBe(true);
    });
  });

  describe('restoreExisting', () => {
    it('round-trips through toRecord', () => {
      const event = OutboxEvent.createNew('patient.created', validPayload);
      const restored = OutboxEvent.restoreExisting(event.toRecord());
      expect(restored.id).toBe(event.id);
      expect(restored.name).toBe(event.name);
      expect(restored.payload).toEqual(event.payload);
      expect(restored.attempts).toBe(event.attempts);
    });
  });
});
