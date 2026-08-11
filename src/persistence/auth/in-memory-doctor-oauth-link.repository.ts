import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { DoctorOAuthLink, IDoctorOAuthLinkRepository } from '@/auth/ports';
import { AuthErrorCode } from '@/common/errors/codes/auth.errors';
import { DomainError } from '@/common/errors/domain.error';

/**
 * In-memory `doctor_oauth_link` store. The real table's UNIQUE (provider,
 * provider_user_id) is enforced here in `link`. Keyed internally by the link
 * id; lookups scan (fine for in-memory — a real adapter indexes the columns).
 */
@Injectable()
export class InMemoryDoctorOAuthLinkRepository implements IDoctorOAuthLinkRepository {
  private readonly store = new Map<string, DoctorOAuthLink>();

  async link(
    doctorId: string,
    provider: string,
    providerUserId: string,
  ): Promise<void> {
    for (const existing of this.store.values()) {
      if (
        existing.provider === provider &&
        existing.providerUserId === providerUserId
      ) {
        throw new DomainError(
          AuthErrorCode.OAUTH_ACCOUNT_ALREADY_LINKED,
          'This provider identity is already linked to an account',
          409,
        );
      }
    }
    const link: DoctorOAuthLink = {
      id: uuidv7(),
      doctorId,
      provider,
      providerUserId,
      linkedAt: new Date(),
    };
    this.store.set(link.id, link);
  }

  async findByProviderIdentity(
    provider: string,
    providerUserId: string,
  ): Promise<DoctorOAuthLink | null> {
    for (const link of this.store.values()) {
      if (
        link.provider === provider &&
        link.providerUserId === providerUserId
      ) {
        return link;
      }
    }
    return null;
  }

  async findByDoctor(doctorId: string): Promise<DoctorOAuthLink[]> {
    return [...this.store.values()].filter((l) => l.doctorId === doctorId);
  }

  async unlink(doctorId: string, provider: string): Promise<void> {
    for (const [id, link] of this.store.entries()) {
      if (link.doctorId === doctorId && link.provider === provider) {
        this.store.delete(id);
      }
    }
  }
}
