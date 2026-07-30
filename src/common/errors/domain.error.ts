import { ErrorCode } from './codes';

/**
 * A DomainError represents an expected, business-rule violation
 * (e.g. "doctor not found", "email already exists").
 *
 * These are safe to expose to clients: both `code` and `message`
 * are surfaced in the HTTP response by the global exception filter.
 *
 * `httpStatus` lets a throw site pick the right status (404 not-found,
 * 409 conflict, …). It defaults to 400 — the common "bad input / rule
 * violation" case — so most call sites don't need to specify it. Kept as a
 * plain number so the domain layer stays free of framework imports.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = 'DomainError';
    // Restore prototype chain when targeting ES5/ES6 transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
