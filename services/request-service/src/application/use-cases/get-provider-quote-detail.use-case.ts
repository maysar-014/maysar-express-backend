/**
 * GetProviderQuoteDetailUseCase (Phase 1 §1.4)
 * Provider/ops view of a quote — includes internal procurement cost.
 * Never used for customer-facing payloads.
 */

import { RequestQuote } from '../../domain/entities/request-quote.entity';
import { RequestQuoteRepository } from '../../domain/repositories/request-quote.repository';
import { NotFoundError } from '../../../../../shared/errors/api-errors';

export class GetProviderQuoteDetailUseCase {
  constructor(private readonly quoteRepo: RequestQuoteRepository) {}

  async execute(_providerId: string, quoteId: string): Promise<RequestQuote> {
    const quote = await this.quoteRepo.findById(quoteId);
    if (!quote) throw new NotFoundError(`Quote ${quoteId} not found`);
    return quote;
  }
}