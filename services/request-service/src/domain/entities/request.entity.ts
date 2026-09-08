/**
 * Request Entity (Phase 1 §1.1)
 *
 * A customer describes a need; Maysar assesses, sources, and fulfils it.
 * State machine — enforced via named transition methods only; there is no
 * public API to write `status` directly.
 *
 *   SUBMITTED → ASSESSING ⇄ NEEDS_CLARIFICATION → ASSESSING → FULFILLABLE
 *                                     ↘ UNFULFILLABLE (requires reason)
 *   FULFILLABLE → QUOTE_PUBLISHED → CONVERTED
 *
 * Customer-cancellable from: SUBMITTED | ASSESSING | NEEDS_CLARIFICATION |
 *                            QUOTE_PUBLISHED
 * Expired (sweeper, Phase 4): any pre-CONVERTED state, when not converted
 * within the validity window.
 */

import { makeId } from '../../../../../shared/ids/id';

export type RequestStatus =
  | 'SUBMITTED'
  | 'ASSESSING'
  | 'NEEDS_CLARIFICATION'
  | 'FULFILLABLE'
  | 'UNFULFILLABLE'
  | 'QUOTE_PUBLISHED'
  | 'CONVERTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type RequestAuthorType =
  | 'CUSTOMER'
  | 'MAYSAR_PROVIDER'
  | 'SYSTEM'
  | 'STATUS'
  | 'QUOTE'
  | 'ORDER';

export interface RequestDeliveryAddress {
  street?: string;
  area?: string;
  city: string;
  region: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface RequestData {
  id: string;
  customerId: string;
  title: string;
  description: string;
  deliveryAddress: RequestDeliveryAddress;
  preferredDeliveryDate: Date | null;
  budgetTzs: number | null;
  attachments: string[] | null;
  status: RequestStatus;
  assignedProviderId: string | null;
  unfulfillableReason: string | null;
  orderId: string | null;
  convertedQuoteId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  SUBMITTED:            ['ASSESSING', 'CANCELLED', 'EXPIRED'],
  ASSESSING:            ['NEEDS_CLARIFICATION', 'FULFILLABLE', 'UNFULFILLABLE', 'CANCELLED', 'EXPIRED'],
  NEEDS_CLARIFICATION:  ['ASSESSING', 'CANCELLED', 'EXPIRED'],
  FULFILLABLE:          ['QUOTE_PUBLISHED', 'EXPIRED'],
  UNFULFILLABLE:        [],
  QUOTE_PUBLISHED:      ['CONVERTED', 'CANCELLED', 'EXPIRED'],
  CONVERTED:            [],
  CANCELLED:            [],
  EXPIRED:              [],
};

export function makeRequestId(): string {
  return makeId('REQ');
}

export class RequestEntity {
  private data: RequestData;

  constructor(data: RequestData) {
    if (!data.customerId) throw new Error('Request invariant violation: customerId is required');
    if (!data.description || data.description.trim() === '') {
      throw new Error('Request invariant violation: description must be non-blank');
    }
    if (!data.title || data.title.trim() === '') {
      throw new Error('Request invariant violation: title must be non-blank');
    }
    if (data.status === 'UNFULFILLABLE' && !data.unfulfillableReason) {
      throw new Error('Request invariant violation: UNFULFILLABLE requires unfulfillableReason');
    }
    if (data.status === 'CONVERTED' && (!data.orderId || !data.convertedQuoteId)) {
      throw new Error('Request invariant violation: CONVERTED requires orderId and convertedQuoteId');
    }
    this.data = { ...data };
  }

  static create(params: {
    customerId: string;
    title: string;
    description: string;
    deliveryAddress: RequestDeliveryAddress;
    preferredDeliveryDate?: Date | null;
    budgetTzs?: number | null;
    attachments?: string[] | null;
  }): RequestEntity {
    const now = new Date();
    return new RequestEntity({
      id: makeRequestId(),
      customerId: params.customerId,
      title: params.title,
      description: params.description,
      deliveryAddress: params.deliveryAddress,
      preferredDeliveryDate: params.preferredDeliveryDate ?? null,
      budgetTzs: params.budgetTzs ?? null,
      attachments: params.attachments ?? null,
      status: 'SUBMITTED',
      assignedProviderId: null,
      unfulfillableReason: null,
      orderId: null,
      convertedQuoteId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  private transition(to: RequestStatus): void {
    const allowed = VALID_TRANSITIONS[this.data.status];
    if (!allowed || !allowed.includes(to)) {
      throw new Error(
        `Request state-machine violation: ${this.data.status} → ${to} is not a legal transition`,
      );
    }
    this.data = { ...this.data, status: to, updatedAt: new Date() };
  }

  // ── Named transitions ─────────────────────────────────────────────────────
  markAssessing(): void { this.transition('ASSESSING'); }
  markNeedsClarification(): void { this.transition('NEEDS_CLARIFICATION'); }
  markFulfillable(): void { this.transition('FULFILLABLE'); }
  markUnfulfillable(reason: string): void {
    if (!reason || reason.trim() === '') {
      throw new Error('Request invariant violation: UNFULFILLABLE requires unfulfillableReason');
    }
    this.transition('UNFULFILLABLE');
    this.data = { ...this.data, unfulfillableReason: reason, updatedAt: new Date() };
  }
  markQuotePublished(): void { this.transition('QUOTE_PUBLISHED'); }
  markConverted(orderId: string, convertedQuoteId: string): void {
    this.transition('CONVERTED');
    this.data = { ...this.data, orderId, convertedQuoteId, updatedAt: new Date() };
  }
  markCancelled(): void { this.transition('CANCELLED'); }
  markExpired(): void { this.transition('EXPIRED'); }

  assignProvider(providerId: string): void {
    if (!providerId) throw new Error('Request invariant violation: providerId is required');
    this.data = { ...this.data, assignedProviderId: providerId, updatedAt: new Date() };
  }

  // ── Read-only accessors ────────────────────────────────────────────────────
  get id() { return this.data.id; }
  get customerId() { return this.data.customerId; }
  get title() { return this.data.title; }
  get description() { return this.data.description; }
  get deliveryAddress() { return this.data.deliveryAddress; }
  get preferredDeliveryDate() { return this.data.preferredDeliveryDate; }
  get budgetTzs() { return this.data.budgetTzs; }
  get attachments() { return this.data.attachments; }
  get status() { return this.data.status; }
  get assignedProviderId() { return this.data.assignedProviderId; }
  get unfulfillableReason() { return this.data.unfulfillableReason; }
  get orderId() { return this.data.orderId; }
  get convertedQuoteId() { return this.data.convertedQuoteId; }
  get createdAt() { return this.data.createdAt; }
  get updatedAt() { return this.data.updatedAt; }

  toJSON(): RequestData {
    return { ...this.data, deliveryAddress: { ...this.data.deliveryAddress } };
  }
}