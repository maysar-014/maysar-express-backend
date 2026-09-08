/**
 * PublishQuoteUseCase (Phase 1 §1.4 + Phase 2 §2.2)
 *
 * Validates the request is FULFILLABLE, the quote is DRAFT and unexpired,
 * stamps publishedAt, transitions the request to QUOTE_PUBLISHED, posts a
 * QUOTE conversation message, and emits quote.published. Only after this
 * completes may an assessment link be generated (§1.5 gate).
 *
 * Phase 2 §2.2 gate: a quote cannot be published unless EVERY item on the
 * quote has at least one CONFIRMED (and unexpired) source. A PENDING or
 * UNAVAILABLE source cannot back a published quote.
 */

import { RequestQuote } from '../../domain/entities/request-quote.entity';
import { RequestMessage } from '../../domain/entities/request-message.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestQuoteRepository } from '../../domain/repositories/request-quote.repository';
import { RequestMessageRepository } from '../../domain/repositories/request-message.repository';
import { RequestItemRepository } from '../../domain/repositories/request-item.repository';
import { RequestSourceRepository } from '../../domain/repositories/request-source.repository';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../../shared/errors/api-errors';
import { publishRequestEvent } from '../../infrastructure/messaging/request-outbox';
import { toCustomerQuoteView } from '../mappers/customer-quote.mapper';
import { recordRequestAudit } from '../services/request-audit';

export interface PublishQuoteResult {
  quote: ReturnType<RequestQuote['toJSON']>;
  customerQuote: ReturnType<typeof toCustomerQuoteView>;
}

export class PublishQuoteUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly quoteRepo: RequestQuoteRepository,
    private readonly messageRepo: RequestMessageRepository,
    private readonly itemRepo: RequestItemRepository,
    private readonly sourceRepo: RequestSourceRepository,
  ) {}

  async execute(providerId: string, quoteId: string): Promise<PublishQuoteResult> {
    const quote = await this.quoteRepo.findById(quoteId);
    if (!quote) throw new NotFoundError(`Quote ${quoteId} not found`);
    if (quote.createdByProviderId !== providerId) {
      throw new ForbiddenError('Only the quote creator can publish this quote');
    }

    const request = await this.requestRepo.findById(quote.requestId);
    if (!request) throw new NotFoundError(`Request ${quote.requestId} not found`);
    if (request.status !== 'FULFILLABLE' && request.status !== 'QUOTE_PUBLISHED') {
      throw new ValidationError('A quote can only be published when the request is FULFILLABLE', {
        currentStatus: request.status,
      });
    }

    // §2.2 publish gate — every item needs a CONFIRMED, unexpired source.
    const items = await this.itemRepo.findByQuoteId(quote.id);
    if (items.length === 0) {
      throw new ValidationError('Cannot publish a quote with no items');
    }
    for (const item of items) {
      const sources = await this.sourceRepo.findByItemId(item.id);
      const usable = sources.filter((s) => s.isUsable(new Date()));
      if (usable.length === 0) {
        throw new ValidationError(
          `Cannot publish quote: item "${item.description}" has no CONFIRMED source`,
          { itemId: item.id, sourceTypes: item.sourceType },
        );
      }
    }

    // Mutating the entity enforces the DRAFT->PUBLISHED + validUntil guard.
    quote.publish(new Date());
    await this.quoteRepo.updateStatus(quote.id, 'PUBLISHED', { publishedAt: quote.publishedAt });

    // §B-6 / Phase 3 — publishing supersedes only a prior PUBLISHED quote
    // with the SAME label (a direct revision of that option). Distinct labels
    // (Best Value / Recommended / Fastest…) coexist as parallel live options — the
    // comparison view is for concurrent options, not superseded ones. A price
    // superseded by a same-label revision must never remain purchasable.
    const priorQuotes = await this.quoteRepo.listByRequest(request.id);
    const priorOffers = priorQuotes.filter(
      (q) => q.status === 'PUBLISHED' && q.id !== quote.id && q.label === quote.label,
    );
    for (const prior of priorOffers) {
      prior.supersede();
      await this.quoteRepo.save(prior);
    }

    // Transition the request only on the first publish; a revision publish
    // leaves the request in QUOTE_PUBLISHED.
    if (request.status === 'FULFILLABLE') {
      request.markQuotePublished();
      await this.requestRepo.save(request);
    await recordRequestAudit({
      requestId: request.id,
      actorType: 'PROVIDER',
      actorId: providerId,
      action: 'QUOTE_PUBLISHED',
      toStatus: 'PUBLISHED',
      detail: { quoteId },
    });
    }

    try {
      const message = RequestMessage.create({
        requestId: request.id,
        authorType: 'QUOTE',
        body: `Your Maysar offer is ready for review.`,
      });
      await this.messageRepo.addMessage(message);
    } catch (err: any) {
      console.error('[PublishQuoteUseCase] Failed to post quote message:', err?.message);
    }

    await publishRequestEvent('quote.published', { quoteId: quote.id, requestId: request.id });

    return { quote: quote.toJSON(), customerQuote: toCustomerQuoteView(quote) };
  }
}