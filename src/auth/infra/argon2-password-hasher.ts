import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { IPasswordHasher } from '@/auth/ports';

/**
 * Argon2id password hasher — the only algorithm used for passwords in this
 * system (never bcrypt, never a bare SHA). Argon2id is memory-hard, which is
 * what makes offline cracking expensive. Defaults from the `argon2` library are
 * sane for a server; tune cost parameters here (not at call sites) if needed.
 */
@Injectable()
export class Argon2PasswordHasher implements IPasswordHasher {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      // A malformed/absent hash must read as "no match",
      // never blow up the login path — the caller has already decided this branch is a failure.
      return false;
    }
  }
}
