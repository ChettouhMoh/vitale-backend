import { ErrorCode } from './codes';

/**
 * An InfrastructureError represents an unexpected failure in an
 * external dependency (database, cache, third-party service).
 *
 * These are NEVER detailed to clients: the global exception filter
 * logs the `cause` privately and returns a generic 503 message.
 */
export class InfrastructureError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'InfrastructureError';
    // Restore prototype chain when targeting ES5/ES6 transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
