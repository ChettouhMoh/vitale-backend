/**
 * IPasswordHasher — hashing is an infrastructure choice behind a port.
 * Implemented with argon2id. `verify` takes the stored hash and the plaintext
 * candidate and returns whether they match; it never throws on mismatch.
 */
export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

export const IPasswordHasher = Symbol('IPasswordHasher');
