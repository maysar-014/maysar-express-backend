/**
 * customer-quote.mapper.ts (Phase 1 §1.4)
 *
 * Maps a RequestQuote to the customer-facing payload. Structurally omits all
 * internal fields: procurementCostTzs, createdByProviderId, and anything
 * supplier-related never appear in the output (§B-3). Enforced by key-absence
 * tests, not by convention.
 */

import { RequestQuote } from '../../domain/entities/request-quote.entity';

export interface CustomerQuoteView {
  quoteId: string;
  label: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceTzs: number;
    specifications?: Record<string, unknown>;
    warranty?: string;
  }>;
  sellingPriceTzs: number;
  deliveryDate: string;
  warrantyNote: string | null;
  explanation: string | null;
  validUntil: string;
}

/** Phase 3 - the option-comparison view over one request's mapped quotes. */
export type QuoteComparisonView = CustomerQuoteView;

export function toCustomerQuoteView(quote: RequestQuote): CustomerQuoteView {
  return {
    quoteId: quote.id,
    label: quote.label,
    items: quote.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceTzs: item.unitPriceTzs,
      ...(item.specifications ? { specifications: item.specifications } : {}),
      ...(item.warranty ? { warranty: item.warranty } : {}),
    })),
    sellingPriceTzs: quote.sellingPriceTzs,
    deliveryDate: quote.deliveryDate.toISOString(),
    warrantyNote: quote.warrantyNote,
    explanation: quote.explanation,
    validUntil: quote.validUntil.toISOString(),
  };
}