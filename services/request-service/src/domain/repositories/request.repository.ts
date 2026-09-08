/**
 * RequestRepository (Phase 1 §1.1)
 */

import { RequestEntity, RequestStatus } from '../entities/request.entity';

export interface RequestPage {
  items: RequestEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface RequestRepository {
  save(request: RequestEntity): Promise<void>;
  findById(id: string): Promise<RequestEntity | null>;
  /** Own requests, newest first, paginated via cursor (id). */
  findByCustomerId(customerId: string, opts?: { limit?: number; cursor?: string | null }): Promise<RequestPage>;
  /** Provider/ops view: assigned or pending requests. */
  findForProvider(providerId: string | null, opts?: { limit?: number; cursor?: string | null }): Promise<RequestPage>;
  updateStatus(id: string, status: RequestStatus, extra?: { unfulfillableReason?: string | null; orderId?: string | null; convertedQuoteId?: string | null }): Promise<void>;
  assignProvider(id: string, providerId: string): Promise<void>;
  /** Full book, newest first — used by the §5.3 demand-analytics surface. */
  listAll(opts?: { limit?: number }): Promise<RequestEntity[]>;
}