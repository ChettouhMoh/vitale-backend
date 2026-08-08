import { EventsErrorCode } from '@/common/errors/codes/events.errors';
import { DomainError } from '@/common/errors/domain.error';

/**
 * EventName — enforces the `<context>.<fact>` snake_case naming convention at
 * the domain boundary, so a malformed name can never be persisted to the outbox.
 * e.g. `doctor.registered`, `auth.email_verification_requested`.
 */
export class EventName {
  private static readonly PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

  private constructor(private readonly _value: string) {}

  static create(value: string): EventName {
    if (!EventName.PATTERN.test(value)) {
      throw new DomainError(
        EventsErrorCode.INVALID_EVENT_NAME,
        `Invalid event name "${value}" — expected <context>.<fact> in snake_case`,
      );
    }
    return new EventName(value);
  }

  get value(): string {
    return this._value;
  }
}
