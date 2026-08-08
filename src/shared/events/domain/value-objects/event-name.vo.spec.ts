import { describe, expect, it } from '@jest/globals';
import { EventName } from './event-name.vo';
import { DomainError } from '@/common/errors/domain.error';
import { EventsErrorCode } from '@/common/errors/codes/events.errors';

describe('EventName', () => {
  it.each([
    'doctor.registered',
    'auth.email_verification_requested',
    'patient.created',
    'card.scanned',
    'a.b',
    'ctx1.fact_2',
  ])('accepts a valid <context>.<fact> name: %s', (name) => {
    expect(EventName.create(name).value).toBe(name);
  });

  it.each([
    ['no dot', 'doctorregistered'],
    ['uppercase', 'Doctor.Registered'],
    ['leading digit in context', '1doctor.registered'],
    ['leading digit in fact', 'doctor.1registered'],
    ['double dot', 'doctor..registered'],
    ['trailing dot', 'doctor.'],
    ['leading dot', '.registered'],
    ['hyphen', 'doctor.kyc-approved'],
    ['space', 'doctor. registered'],
    ['three segments', 'a.b.c'],
    ['empty', ''],
  ])('rejects an invalid name (%s)', (_label, name) => {
    expect(() => EventName.create(name)).toThrow(DomainError);
    try {
      EventName.create(name);
    } catch (err) {
      expect((err as DomainError).code).toBe(
        EventsErrorCode.INVALID_EVENT_NAME,
      );
    }
  });
});
