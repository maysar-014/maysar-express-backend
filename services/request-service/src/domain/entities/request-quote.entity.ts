/**
 * RequestQuote Entity (Phase 1 §1.4)
 *
 * A Maysar offer for a Request.
 *  - sellingPriceTzs ≥ procurementCostTzs + logisticsCostTzs (never sell below
 *    cost — invariant, enforced in the constructor)
 *  - validUntil > publishedAt
 *  - DRAFT quotes are invisible to customers
 *  - PUBLISHED quotes are immutable: any change creates a NEW quote row and
 *    the old one is SUPERSEDED. There is no update path on a published quote.
 */

import { makeId } from '../../../../../shared/ids/id';
import { ItemSourceType } from './request-item.entity';

export type QuoteStatus = 'DRAFT' | 'PUBLISHED' | 'CONVERTED' | 'EXPIRED' | 'SUPERSEDED';

export interface QuoteItem {
  description: string;
  quantity: number;
  unitPriceTzs: number;
  specifications?: Record<string, unknown>;
  warranty?: string;
  // Phase 2 §2.1 sourcing metadata. Optional for backward-compat with Phase 1
  // callers — defaults to EXTERNAL_SUPPLIER when the Request_Item row is
  // materialized.
  sourceType?: ItemSourceType;
  catalogProductId?: string;
  fulfillmentNote?: string;
}

export interface RequestQuoteData {
  id: string;
  requestId: string;
  createdByProviderId: string;
  label: string;
  status: QuoteStatus;
  items: QuoteItem[];
  procurementCostTzs: number;
  logisticsCostTzs: number;
  sellingPriceTzs: number;
  deliveryDate: Date;
  warrantyNote: string | null;
  explanation: string | null;
  validUntil: Date;
  publishedAt: Date | null;
  createdAt: Date;
}

export function makeRequestQuoteId(): string {
  return makeId('RQT');
}

export class RequestQuote {
  private data: RequestQuoteData;

  constructor(data: RequestQuoteData) {
    if (!data.procurementCostTzs || data.procurementCostTzs < 0) {
      throw new Error('RequestQuote invariant violation: procurementCostTzs must be ≥ 0');
    }
    if (!data.logisticsCostTzs || data.logisticsCostTzs < 0) {
      throw new Error('RequestQuote invariant violation: logisticsCostTzs must be ≥ 0');
    }
    if (data.sellingPriceTzs < data.procurementCostTzs + data.logisticsCostTzs) {
      throw new Error(
        `RequestQuote invariant violation: sellingPriceTzs (${data.sellingPriceTzs}) must be ≥ procurement + logistics (${data.procurementCostTzs + data.logisticsCostTzs})`,
      );
    }
    if (data.items.length === 0) {
      throw new Error('RequestQuote invariant violation: quote must contain at least one item');
    }
    for (const item of data.items) {
      if (!item.description || item.description.trim() === '') {
        throw new Error('RequestQuote invariant violation: every item needs a description');
      }
      if (item.quantity <= 0) throw new Error('RequestQuote invariant violation: item quantity must be > 0');
      if (item.unitPriceTzs < 0) throw new Error('RequestQuote invariant violation: item unitPriceTzs must be ≥ 0');
    }
    if (data.status !== 'DRAFT' && !data.publishedAt) {
      throw new Error(`RequestQuote invariant violation: ${data.status} requires publishedAt`);
    }
    if (data.publishedAt && data.validUntil <= data.publishedAt) {
      throw new Error('RequestQuote invariant violation: validUntil must be after publishedAt');
    }
    this.data = { ...data, items: data.items.map(i => ({ ...i })) };
  }

  static draft(params: {
    requestId: string;
    createdByProviderId: string;
    label: string;
    items: QuoteItem[];
    procurementCostTzs: number;
    logisticsCostTzs: number;
    sellingPriceTzs: number;
    deliveryDate: Date;
    warrantyNote?: string | null;
    explanation?: string | null;
    validUntil: Date;
  }): RequestQuote {
    return new RequestQuote({
      id: makeRequestQuoteId(),
      requestId: params.requestId,
      createdByProviderId: params.createdByProviderId,
      label: params.label,
      status: 'DRAFT',
      items: params.items,
      procurementCostTzs: params.procurementCostTzs,
      logisticsCostTzs: params.logisticsCostTzs,
      sellingPriceTzs: params.sellingPriceTzs,
      deliveryDate: params.deliveryDate,
      warrantyNote: params.warrantyNote ?? null,
      explanation: params.explanation ?? null,
      validUntil: params.validUntil,
      publishedAt: null,
      createdAt: new Date(),
    });
  }

  /** Publish this DRAFT quote (immutable from here on — no further mutations). */
  publish(now: Date = new Date()): void {
    if (this.data.status !== 'DRAFT') {
      throw new Error(`RequestQuote invariant violation: only DRAFT quotes can be published (current: ${this.data.status})`);
    }
    if (this.data.validUntil <= now) {
      throw new Error('RequestQuote invariant violation: cannot publish a quote whose validUntil has already passed');
    }
    this.data = { ...this.data, status: 'PUBLISHED', publishedAt: now };
  }

  markConverted(): void {
    if (this.data.status !== 'PUBLISHED') {
      throw new Error(`RequestQuote invariant violation: only PUBLISHED quotes can be converted (current: ${this.data.status})`);
    }
    this.data = { ...this.data, status: 'CONVERTED' };
  }

  supersede(): void {
    if (this.data.status !== 'PUBLISHED' && this.data.status !== 'DRAFT') {
      throw new Error(`RequestQuote invariant violation: cannot supersede a quote in state ${this.data.status}`);
    }
    this.data = { ...this.data, status: 'SUPERSEDED' };
  }

  markExpired(): void {
    if (this.data.status !== 'PUBLISHED' && this.data.status !== 'DRAFT') {
      throw new Error(`RequestQuote invariant violation: cannot expire a quote in state ${this.data.status}`);
    }
    this.data = { ...this.data, status: 'EXPIRED' };
  }

  // ── Read-only accessors ────────────────────────────────────────────────────
  get id() { return this.data.id; }
  get requestId() { return this.data.requestId; }
  get createdByProviderId() { return this.data.createdByProviderId; }
  get label() { return this.data.label; }
  get status() { return this.data.status; }
  get items() { return [...this.data.items].map(i => ({ ...i })); }
  get procurementCostTzs() { return this.data.procurementCostTzs; }
  get logisticsCostTzs() { return this.data.logisticsCostTzs; }
  get sellingPriceTzs() { return this.data.sellingPriceTzs; }
  get deliveryDate() { return this.data.deliveryDate; }
  get warrantyNote() { return this.data.warrantyNote; }
  get explanation() { return this.data.explanation; }
  get validUntil() { return this.data.validUntil; }
  get publishedAt() { return this.data.publishedAt; }
  get createdAt() { return this.data.createdAt; }

  toJSON(): RequestQuoteData {
    return { ...this.data, items: this.data.items.map(i => ({ ...i })) };
  }
}