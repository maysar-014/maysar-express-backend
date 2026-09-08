/**
 * CreateQuoteUseCase (Phase 1 §1.4 + Phase 2 §2.1)
 *
 * Provider creates a DRAFT quote on a FULFILLABLE request. Quote invariants
 * (selling ≥ procurement + logistics, validUntil in future, non-empty items)
 * are enforced by the RequestQuote entity. Each item is ALSO materialized as a
 * first-class Request_Item row (bound to the quote) so sourcing (§2.2) and
 * procurement (§2.3) have their own identity.
 */

import { RequestQuote, QuoteItem } from '../../domain/entities/request-quote.entity';
import { RequestItem } from '../../domain/entities/request-item.entity';
import { RequestEntity } from '../../domain/entities/request.entity';
import { RequestRepository } from '../../domain/repositories/request.repository';
import { RequestQuoteRepository } from '../../domain/repositories/request-quote.repository';
import { RequestItemRepository } from '../../domain/repositories/request-item.repository';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../../shared/errors/api-errors';
import { recordRequestAudit } from '../services/request-audit';

export interface CreateQuoteInput {
  label: string;
  items: QuoteItem[];
  procurementCostTzs: number;
  logisticsCostTzs: number;
  sellingPriceTzs: number;
  deliveryDate: string;
  warrantyNote?: string | null;
  explanation?: string | null;
  validUntil: string;
}

export interface CreateQuoteResult {
  quote: ReturnType<RequestQuote['toJSON']>;
  /** The materialized Request_Item rows bound to this quote (§2.1). */
  itemIds: string[];
}

export class CreateQuoteUseCase {
  constructor(
    private readonly requestRepo: RequestRepository,
    private readonly quoteRepo: RequestQuoteRepository,
    private readonly itemRepo: RequestItemRepository,
  ) {}

  async execute(providerId: string, requestId: string, input: CreateQuoteInput): Promise<CreateQuoteResult> {
    const request = await this.requestRepo.findById(requestId);
    if (!request) throw new NotFoundError(`Request ${requestId} not found`);
    if (request.assignedProviderId !== providerId) {
      throw new ForbiddenError('Only the assigned provider can create a quote for this request');
    }
    // A revision (§B-6) is also quoted while the request is QUOTE_PUBLISHED —
    // the new draft supersedes the published version when published.
    if (request.status !== 'FULFILLABLE' && request.status !== 'QUOTE_PUBLISHED') {
      throw new ValidationError('Quotes can only be created on FULFILLABLE requests', {
        currentStatus: request.status,
      });
    }
    if (!input.label || input.label.trim() === '') {
      throw new ValidationError('label is required');
    }
    if (!input.deliveryDate) throw new ValidationError('deliveryDate is required');
    if (!input.validUntil) throw new ValidationError('validUntil is required');

    const quote = RequestQuote.draft({
      requestId: request.id,
      createdByProviderId: providerId,
      label: input.label.trim(),
      items: input.items,
      procurementCostTzs: input.procurementCostTzs,
      logisticsCostTzs: input.logisticsCostTzs,
      sellingPriceTzs: input.sellingPriceTzs,
      deliveryDate: new Date(input.deliveryDate),
      warrantyNote: input.warrantyNote,
      explanation: input.explanation,
      validUntil: new Date(input.validUntil),
    });

    await this.quoteRepo.save(quote);
    await recordRequestAudit({
      requestId: quote.requestId,
      actorType: 'PROVIDER',
      actorId: providerId,
      action: 'QUOTE_CREATED',
      detail: { quoteId: quote.id },
    });

    // §2.1 — materialize first-class Request_Item rows for the quote.
    const itemIds: string[] = [];
    for (const item of input.items) {
      const row = RequestItem.create({
        requestId: request.id,
        quoteId: quote.id,
        description: item.description,
        quantity: item.quantity,
        unitPriceTzs: item.unitPriceTzs,
        specifications: item.specifications,
        warranty: item.warranty,
        sourceType: item.sourceType,
        catalogProductId: item.catalogProductId,
        fulfillmentNote: item.fulfillmentNote,
      });
      await this.itemRepo.save(row);
      itemIds.push(row.id);
    }

    return { quote: quote.toJSON(), itemIds };
  }
}