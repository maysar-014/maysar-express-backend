/**
 * ListCustomerQuotesUseCase (Phase 1 §1.4)
 * Customer-visible quotes (non-DRAFT) mapped through the customer mapper —
 * internal costs are structurally omitted.
 */

import { CustomerQuoteView, toCustomerQuoteView } from '../mappers/customer-quote.mapper';
import { RequestQuoteRepository } from '../../domain/repositories/request-quote.repository';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { NotFoundError } from '../../../../../shared/errors/api-errors';

export class ListCustomerQuotesUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly quoteRepo: RequestQuoteRepository,
  ) {}

  async execute(requestId: string): Promise<CustomerQuoteView[]> {
    const requestExists = await this.requestRepo.findById(requestId);
    if (!requestExists) throw new NotFoundError(`Request ${requestId} not found`);

    const quotes = await this.quoteRepo.listCustomerVisible(requestId);
    return quotes.map((q) => toCustomerQuoteView(q));
  }
}