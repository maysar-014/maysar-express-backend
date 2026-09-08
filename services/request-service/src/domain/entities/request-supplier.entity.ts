/**
 * RequestSupplier Entity (Phase 2 §2.2)
 *
 * A fulfillment source — NOT a Maysar seller. No auth account, never shown to
 * the customer. `source` distinguishes pre-registered KNOWN suppliers from
 * DISCOVERED ones (which must carry the originating request reference for the
 * Phase 5 invite loop).
 */

import { makeId } from '../../../../../shared/ids/id';

export type SupplierSourceType = 'KNOWN' | 'DISCOVERED';

export const SUPPLIER_SOURCE_TYPES: readonly SupplierSourceType[] = ['KNOWN', 'DISCOVERED'];

export interface SupplierContact {
  phone?: string;
  whatsapp?: string;
  email?: string;
}

export type SupplierInviteStatus = 'PENDING' | 'INVITE_READY' | 'INVITED';

export interface RequestSupplierData {
  id: string;
  name: string;
  contact: SupplierContact;
  source: SupplierSourceType;
  discoveredViaRequestId: string | null;
  /** Defaults to PENDING when omitted (canonical/legacy rows). */
  inviteStatus?: SupplierInviteStatus;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
}

export function makeRequestSupplierId(): string {
  return makeId('SUP');
}

/** Canonical supplier row for MAYSAR_INVENTORY items (§2.2). */
export const MAYSAR_INVENTORY_SUPPLIER_ID = 'sup_maysar_inventory';

export class RequestSupplier {
  private data: RequestSupplierData;

  constructor(data: RequestSupplierData) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('RequestSupplier invariant violation: name is required');
    }
    const contact = data.contact ?? {};
    if (!contact.phone && !contact.whatsapp && !contact.email) {
      throw new Error('RequestSupplier invariant violation: at least one contact method is required');
    }
    if (!SUPPLIER_SOURCE_TYPES.includes(data.source)) {
      throw new Error(`RequestSupplier invariant violation: unknown source ${data.source}`);
    }
    if (data.source === 'DISCOVERED' && !data.discoveredViaRequestId) {
      throw new Error('RequestSupplier invariant violation: DISCOVERED suppliers need discoveredViaRequestId');
    }
    if (data.source === 'KNOWN' && data.discoveredViaRequestId) {
      throw new Error('RequestSupplier invariant violation: KNOWN suppliers cannot carry discoveredViaRequestId');
    }
    this.data = { ...data, contact: { ...contact }, inviteStatus: data.inviteStatus ?? 'PENDING' };
  }

  /** Phase 5: ops review outcome — supplier becomes invite-ready. */
  markInviteReady(): void {
    if (this.data.inviteStatus === 'INVITED') {
      throw new Error('RequestSupplier invariant violation: INVITED suppliers cannot go back to INVITE_READY');
    }
    this.data = { ...this.data, inviteStatus: 'INVITE_READY' };
  }

  /** Phase 5: invite handoff done (normal seller onboarding takes over). */
  markInvited(): void {
    if (this.data.inviteStatus === 'PENDING') {
      throw new Error('RequestSupplier invariant violation: supplier must be INVITE_READY before INVITED');
    }
    this.data = { ...this.data, inviteStatus: 'INVITED' };
  }

  static create(params: {
    name: string;
    contact: SupplierContact;
    source?: SupplierSourceType;
    discoveredViaRequestId?: string | null;
    isActive?: boolean;
    notes?: string | null;
  }): RequestSupplier {
    return new RequestSupplier({
      id: makeRequestSupplierId(),
      name: params.name,
      contact: params.contact,
      source: params.source ?? 'KNOWN',
      discoveredViaRequestId: params.discoveredViaRequestId ?? null,
      isActive: params.isActive ?? true,
      notes: params.notes ?? null,
      createdAt: new Date(),
    });
  }

  deactivate(): void {
    this.data = { ...this.data, isActive: false };
  }

  activate(): void {
    this.data = { ...this.data, isActive: true };
  }

  // ── Read-only accessors ────────────────────────────────────────────────────
  get id() { return this.data.id; }
  get name() { return this.data.name; }
  get contact() { return { ...this.data.contact }; }
  get source() { return this.data.source; }
  get discoveredViaRequestId() { return this.data.discoveredViaRequestId; }
  get inviteStatus() { return this.data.inviteStatus; }
  get isActive() { return this.data.isActive; }
  get notes() { return this.data.notes; }
  get createdAt() { return this.data.createdAt; }

  toJSON(): RequestSupplierData {
    return { ...this.data, contact: { ...this.data.contact } };
  }
}