/**
 * RequestAccessLinkRepository (Phase 1 §1.5)
 */

import { RequestAccessLink, AccessLinkStatus } from '../entities/request-access-link.entity';

export interface RequestAccessLinkRepository {
  save(link: RequestAccessLink): Promise<void>;
  updateStatus(id: string, status: AccessLinkStatus, extra?: { usedAt?: Date | null }): Promise<void>;
  findByHash(tokenHash: string): Promise<RequestAccessLink | null>;
  findById(id: string): Promise<RequestAccessLink | null>;
  listByQuote(quoteId: string): Promise<RequestAccessLink[]>;
}