/**
 * ResolveAssessmentLinkUseCase (Phase 1 §1.5)
 *
 * Public, token-gated. The token is the credential — it is bound to the
 * customer in Request_AccessLink. Validates: hash match, ACTIVE, not expired,
 * and fulfillment still confirmed (request QUOTE_PUBLISHED + quote PUBLISHED).
 *
 * Returns the mapped customer quote — never internal fields.
 */

import { RequestAccessLink, hashToken } from '../../domain/entities/request-access-link.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestQuoteRepository } from '../../domain/repositories/request-quote.repository';
import { RequestAccessLinkRepository } from '../../domain/repositories/request-access-link.repository';
import { CustomerQuoteView, toCustomerQuoteView } from '../mappers/customer-quote.mapper';

export const LINK_ERRORS = {
  NOT_FOUND: 'LINK_NOT_FOUND',
  EXPIRED: 'LINK_EXPIRED',
  ALREADY_USED: 'LINK_ALREADY_USED',
  REVOKED: 'LINK_REVOKED',
  FULFILLMENT_NOT_CONFIRMED: 'FULFILLMENT_NOT_CONFIRMED',
  QUOTE_NOT_AVAILABLE: 'QUOTE_NOT_AVAILABLE',
  QUOTE_EXPIRED: 'QUOTE_EXPIRED',
} as const;

export class LinkResolutionError extends Error {
  constructor(
    public readonly code: (typeof LINK_ERRORS)[keyof typeof LINK_ERRORS],
    message: string,
  ) {
    super(message);
    this.name = 'LinkResolutionError';
  }
}

export interface ResolveAssessmentLinkResult {
  requestId: string;
  quoteId: string;
  customerId: string;
  quote: CustomerQuoteView;
}

export class ResolveAssessmentLinkUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly quoteRepo: RequestQuoteRepository,
    private readonly linkRepo: RequestAccessLinkRepository,
  ) {}

  async execute(rawToken: string, now: Date = new Date()): Promise<ResolveAssessmentLinkResult> {
    const link = await this.linkRepo.findByHash(hashToken(rawToken));
    if (!link) throw new LinkResolutionError(LINK_ERRORS.NOT_FOUND, 'Link not found');

    if (link.status === 'USED') throw new LinkResolutionError(LINK_ERRORS.ALREADY_USED, 'This link has already been used');
    if (link.status === 'REVOKED') throw new LinkResolutionError(LINK_ERRORS.REVOKED, 'This link has been revoked');
    if (link.status === 'EXPIRED' || link.expiresAt < now) {
      throw new LinkResolutionError(LINK_ERRORS.EXPIRED, 'This link has expired');
    }

    const request = await this.requestRepo.findById(link.requestId);
    if (!request || request.status !== 'QUOTE_PUBLISHED') {
      throw new LinkResolutionError(LINK_ERRORS.FULFILLMENT_NOT_CONFIRMED, 'Fulfillment for this request is no longer confirmed');
    }

    const quote = await this.quoteRepo.findById(link.quoteId);
    if (!quote || quote.status !== 'PUBLISHED') {
      throw new LinkResolutionError(LINK_ERRORS.QUOTE_NOT_AVAILABLE, 'The quote is no longer available');
    }
    if (quote.validUntil < now) {
      // Distinct code (Phase 4 §4.1): the offer existed but its validity window has passed.
      throw new LinkResolutionError(LINK_ERRORS.QUOTE_EXPIRED, 'The quoted offer has expired');
    }

    return {
      requestId: request.id,
      quoteId: quote.id,
      customerId: link.customerId,
      quote: toCustomerQuoteView(quote),
    };
  }
}