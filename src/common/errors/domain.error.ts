import { ErrorCode } from './codes';

/**
 * A DomainError represents an expected, business-rule violation
 * (e.g. "doctor not found", "email already exists").
 *
 * These are safe to expose to clients: both `code` and `message`
 * are surfaced in the HTTP response by the global exception filter.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
    // Restore prototype chain when targeting ES5/ES6 transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
