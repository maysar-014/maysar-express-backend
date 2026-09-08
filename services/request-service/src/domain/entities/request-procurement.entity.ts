/**
 * RequestProcurement Entity (Phase 2 §2.3)
 *
 * The exact post-order map: Order → Item → Supplier. Maysar-internal — the
 * customer never sees procurement rows. State machine enforced via named
 * transition methods only:
 *   PENDING → ORDERED → RECEIVED | FAILED
 */

import { makeId } from '../../../../../shared/ids/id';

export type ProcurementStatus = 'PENDING' | 'ORDERED' | 'RECEIVED' | 'FAILED';

export const PROCUREMENT_STATUSES: readonly ProcurementStatus[] = ['PENDING', 'ORDERED', 'RECEIVED', 'FAILED'];

export interface RequestProcurementData {
  id: string;
  orderId: string;
  itemId: string;
  supplierId: string;
  sourceId: string | null;
  agreedPriceTzs: number;
  procurementStatus: ProcurementStatus;
  orderedAt: Date | null;
  receivedAt: Date | null;
  notes: string | null;
  createdAt: Date;
}

export function makeRequestProcurementId(): string {
  return makeId('PRC');
}

export class RequestProcurement {
  private data: RequestProcurementData;

  constructor(data: RequestProcurementData) {
    if (data.agreedPriceTzs < 0) {
      throw new Error('RequestProcurement invariant violation: agreedPriceTzs must be ≥ 0');
    }
    if (!PROCUREMENT_STATUSES.includes(data.procurementStatus)) {
      throw new Error(`RequestProcurement invariant violation: unknown status ${data.procurementStatus}`);
    }
    if (data.procurementStatus !== 'PENDING' && !data.orderedAt) {
      throw new Error('RequestProcurement invariant violation: advancing from PENDING requires orderedAt');
    }
    if (data.procurementStatus === 'RECEIVED' && !data.receivedAt) {
      throw new Error('RequestProcurement invariant violation: RECEIVED requires receivedAt');
    }
    this.data = { ...data };
  }

  static create(params: {
    orderId: string;
    itemId: string;
    supplierId: string;
    sourceId?: string | null;
    agreedPriceTzs: number;
    notes?: string | null;
  }): RequestProcurement {
    return new RequestProcurement({
      id: makeRequestProcurementId(),
      orderId: params.orderId,
      itemId: params.itemId,
      supplierId: params.supplierId,
      sourceId: params.sourceId ?? null,
      agreedPriceTzs: params.agreedPriceTzs,
      procurementStatus: 'PENDING',
      orderedAt: null,
      receivedAt: null,
      notes: params.notes ?? null,
      createdAt: new Date(),
    });
  }

  markOrdered(at: Date = new Date()): void {
    if (this.data.procurementStatus !== 'PENDING') {
      throw new Error(`RequestProcurement invariant violation: only PENDING can be ordered (current: ${this.data.procurementStatus})`);
    }
    this.data = { ...this.data, procurementStatus: 'ORDERED', orderedAt: at };
  }

  markReceived(at: Date = new Date()): void {
    if (this.data.procurementStatus !== 'ORDERED') {
      throw new Error(`RequestProcurement invariant violation: only ORDERED can be received (current: ${this.data.procurementStatus})`);
    }
    this.data = { ...this.data, procurementStatus: 'RECEIVED', receivedAt: at };
  }

  markFailed(reason?: string): void {
    if (this.data.procurementStatus !== 'PENDING' && this.data.procurementStatus !== 'ORDERED') {
      throw new Error(`RequestProcurement invariant violation: cannot fail a procurement in ${this.data.procurementStatus}`);
    }
    this.data = { ...this.data, procurementStatus: 'FAILED', notes: reason ?? this.data.notes };
  }

  // ── Read-only accessors ────────────────────────────────────────────────────
  get id() { return this.data.id; }
  get orderId() { return this.data.orderId; }
  get itemId() { return this.data.itemId; }
  get supplierId() { return this.data.supplierId; }
  get sourceId() { return this.data.sourceId; }
  get agreedPriceTzs() { return this.data.agreedPriceTzs; }
  get procurementStatus() { return this.data.procurementStatus; }
  get orderedAt() { return this.data.orderedAt; }
  get receivedAt() { return this.data.receivedAt; }
  get notes() { return this.data.notes; }
  get createdAt() { return this.data.createdAt; }

  toJSON(): RequestProcurementData {
    return { ...this.data };
  }
}