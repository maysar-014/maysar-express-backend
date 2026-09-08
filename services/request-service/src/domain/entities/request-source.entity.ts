/**
 * RequestSource Entity (Phase 2 §2.2)
 *
 * The provider-facing record linking a RequestItem to a supplier (or to
 * Maysar's own inventory, supplierId null). Multiple sources may exist per
 * item; a quote can only be published when every item has at least one
 * CONFIRMED source (the publish gate in PublishQuoteUseCase).
 */

import { makeId } from '../../../../../shared/ids/id';

export type SourceAvailability = 'CONFIRMED' | 'PENDING' | 'UNAVAILABLE';

export const SOURCE_AVAILABILITIES: readonly SourceAvailability[] = ['CONFIRMED', 'PENDING', 'UNAVAILABLE'];

export interface RequestSourceData {
  id: string;
  itemId: string;
  supplierId: string | null;
  agreedPriceTzs: number;
  availability: SourceAvailability;
  availableUntil: Date | null;
  notes: string | null;
  createdAt: Date;
}

export function makeRequestSourceId(): string {
  return makeId('SRC');
}

export class RequestSource {
  private data: RequestSourceData;

  constructor(data: RequestSourceData) {
    if (data.agreedPriceTzs < 0) {
      throw new Error('RequestSource invariant violation: agreedPriceTzs must be ≥ 0');
    }
    if (!SOURCE_AVAILABILITIES.includes(data.availability)) {
      throw new Error(`RequestSource invariant violation: unknown availability ${data.availability}`);
    }
    this.data = { ...data };
  }

  static create(params: {
    itemId: string;
    supplierId: string | null;
    agreedPriceTzs: number;
    availability?: SourceAvailability;
    availableUntil?: Date | null;
    notes?: string | null;
  }): RequestSource {
    return new RequestSource({
      id: makeRequestSourceId(),
      itemId: params.itemId,
      supplierId: params.supplierId,
      agreedPriceTzs: params.agreedPriceTzs,
      availability: params.availability ?? 'PENDING',
      availableUntil: params.availableUntil ?? null,
      notes: params.notes ?? null,
      createdAt: new Date(),
    });
  }

  setAvailability(availability: SourceAvailability): void {
    this.data = { ...this.data, availability };
  }

  confirm(availableUntil?: Date | null): void {
    this.data = { ...this.data, availability: 'CONFIRMED', availableUntil: availableUntil ?? this.data.availableUntil };
  }

  markPending(): void {
    this.data = { ...this.data, availability: 'PENDING' };
  }

  markUnavailable(): void {
    this.data = { ...this.data, availability: 'UNAVAILABLE' };
  }

  /** A source is usable when CONFIRMED and not expired. */
  isUsable(now: Date = new Date()): boolean {
    if (this.data.availability !== 'CONFIRMED') return false;
    if (this.data.availableUntil && this.data.availableUntil <= now) return false;
    return true;
  }

  // ── Read-only accessors ────────────────────────────────────────────────────
  get id() { return this.data.id; }
  get itemId() { return this.data.itemId; }
  get supplierId() { return this.data.supplierId; }
  get agreedPriceTzs() { return this.data.agreedPriceTzs; }
  get availability() { return this.data.availability; }
  get availableUntil() { return this.data.availableUntil; }
  get notes() { return this.data.notes; }
  get createdAt() { return this.data.createdAt; }

  toJSON(): RequestSourceData {
    return { ...this.data };
  }
}