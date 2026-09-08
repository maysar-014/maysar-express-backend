/**
 * RequestItem Entity (Phase 2 §2.1)
 *
 * A first-class line item on a Request. The four-way separation (§B-1) is
 * enforced structurally:
 *   - CATALOG_PRODUCT items MUST carry catalogProductId
 *   - every other sourceType MUST NOT carry catalogProductId
 *
 * Items may exist before quoting (quoteId null); binding to a quote happens
 * when the provider includes the item in a quote.
 */

import { makeId } from '../../../../../shared/ids/id';

export type ItemSourceType = 'CATALOG_PRODUCT' | 'KNOWN_SUPPLIER' | 'EXTERNAL_SUPPLIER' | 'MAYSAR_INVENTORY';

export const ITEM_SOURCE_TYPES: readonly ItemSourceType[] = [
  'CATALOG_PRODUCT',
  'KNOWN_SUPPLIER',
  'EXTERNAL_SUPPLIER',
  'MAYSAR_INVENTORY',
];

export interface RequestItemData {
  id: string;
  requestId: string;
  quoteId: string | null;
  description: string;
  quantity: number;
  unitPriceTzs: number;
  specifications: Record<string, unknown> | null;
  warranty: string | null;
  sourceType: ItemSourceType;
  catalogProductId: string | null;
  fulfillmentNote: string | null;
  createdAt: Date;
}

export function makeRequestItemId(): string {
  return makeId('RIT');
}

export class RequestItem {
  private data: RequestItemData;

  constructor(data: RequestItemData) {
    if (!data.description || data.description.trim() === '') {
      throw new Error('RequestItem invariant violation: description is required');
    }
    if (!data.quantity || data.quantity <= 0) {
      throw new Error('RequestItem invariant violation: quantity must be > 0');
    }
    if (data.unitPriceTzs < 0) {
      throw new Error('RequestItem invariant violation: unitPriceTzs must be ≥ 0');
    }
    if (!ITEM_SOURCE_TYPES.includes(data.sourceType)) {
      throw new Error(`RequestItem invariant violation: unknown sourceType ${data.sourceType}`);
    }
    // §B-1 enforced structurally:
    if (data.sourceType === 'CATALOG_PRODUCT' && !data.catalogProductId) {
      throw new Error('RequestItem invariant violation: CATALOG_PRODUCT items must carry catalogProductId');
    }
    if (data.sourceType !== 'CATALOG_PRODUCT' && data.catalogProductId) {
      throw new Error('RequestItem invariant violation: only CATALOG_PRODUCT items may carry catalogProductId');
    }
    this.data = { ...data, specifications: data.specifications ? { ...data.specifications } : null };
  }

  static create(params: {
    requestId: string;
    quoteId?: string | null;
    description: string;
    quantity: number;
    unitPriceTzs: number;
    specifications?: Record<string, unknown> | null;
    warranty?: string | null;
    sourceType?: ItemSourceType;
    catalogProductId?: string | null;
    fulfillmentNote?: string | null;
  }): RequestItem {
    return new RequestItem({
      id: makeRequestItemId(),
      requestId: params.requestId,
      quoteId: params.quoteId ?? null,
      description: params.description,
      quantity: params.quantity,
      unitPriceTzs: params.unitPriceTzs,
      specifications: params.specifications ?? null,
      warranty: params.warranty ?? null,
      sourceType: params.sourceType ?? 'EXTERNAL_SUPPLIER',
      catalogProductId: params.catalogProductId ?? null,
      fulfillmentNote: params.fulfillmentNote ?? null,
      createdAt: new Date(),
    });
  }

  /** Bind this item to a quote (only when currently unbound). */
  bindToQuote(quoteId: string): void {
    if (this.data.quoteId && this.data.quoteId !== quoteId) {
      throw new Error('RequestItem invariant violation: item is already bound to another quote');
    }
    this.data = { ...this.data, quoteId };
  }

  // ── Read-only accessors ────────────────────────────────────────────────────
  get id() { return this.data.id; }
  get requestId() { return this.data.requestId; }
  get quoteId() { return this.data.quoteId; }
  get description() { return this.data.description; }
  get quantity() { return this.data.quantity; }
  get unitPriceTzs() { return this.data.unitPriceTzs; }
  get specifications() { return this.data.specifications; }
  get warranty() { return this.data.warranty; }
  get sourceType() { return this.data.sourceType; }
  get catalogProductId() { return this.data.catalogProductId; }
  get fulfillmentNote() { return this.data.fulfillmentNote; }
  get createdAt() { return this.data.createdAt; }

  toJSON(): RequestItemData {
    return { ...this.data, specifications: this.data.specifications ? { ...this.data.specifications } : null };
  }
}