/**
 * RequestQuoteRepository (Phase 1 §1.4)
 */

import { RequestQuote, QuoteStatus } from '../entities/request-quote.entity';

export interface RequestQuoteRepository {
  save(quote: RequestQuote): Promise<void>;
  /** Persist only the status change (PUBLISHED/CONVERTED/EXPIRED/SUPERSEDED). */
  updateStatus(id: string, status: QuoteStatus, extra?: { publishedAt?: Date | null }): Promise<void>;
  findById(id: string): Promise<RequestQuote | null>;
  listByRequest(requestId: string): Promise<RequestQuote[]>;
  /** Non-DRAFT quotes for a request (customer-visible set). */
  listCustomerVisible(requestId: string): Promise<RequestQuote[]>;
  /** All quotes, newest first — used by the §5.3 demand-analytics surface. */
  listAll(opts?: { limit?: number }): Promise<RequestQuote[]>;
}