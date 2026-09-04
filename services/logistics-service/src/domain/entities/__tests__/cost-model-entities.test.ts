/**
 * Phase 3 §3.2–3.4 entity tests: CostAdjustment (immutable), LedgerEntry
 * (append-only), FulfillmentCommitment (price lock state machine).
 */

import { CostAdjustment } from '../cost-adjustment.entity';
import { LedgerEntry } from '../ledger-entry.entity';
import { FulfillmentCommitment } from '../fulfillment-commitment.entity';

describe('CostAdjustment (immutable)', () => {
  const make = (overrides: Record<string, any> = {}) => CostAdjustment.create({
    id: 'adj_1',
    deliveryJobId: 'DJB_1',
    adjustmentType: 'WAITING',
    amountTzs: 350,
    responsibleParty: 'SUPPLIER',
    reason: 'Supplier not ready at pickup window',
    recordedBy: 'ops-user-1',
    ...overrides,
  });

  it('creates with all attribution fields', () => {
    const a = make();
    expect(a.adjustmentType).toBe('WAITING');
    expect(a.responsibleParty).toBe('SUPPLIER');
    expect(a.amountTzs).toBe(350);
    expect(a.shipmentId).toBeNull();
  });

  it('defaults shipmentId and evidenceUrl to null', () => {
    expect(make().shipmentId).toBeNull();
    expect(make().evidenceUrl).toBeNull();
  });

  it('rejects unknown types, parties, negative amounts, blank reasons', () => {
    expect(() => make({ adjustmentType: 'SOMETHING' })).toThrow(/adjustmentType/);
    expect(() => make({ responsibleParty: 'NOBODY' })).toThrow(/responsibleParty/);
    expect(() => make({ amountTzs: -1 })).toThrow(/cannot be negative/);
    expect(() => make({ reason: '  ' })).toThrow(/reason is required/);
  });

  it('toData output rebuilds an equivalent immutable record', () => {
    expect(new CostAdjustment(make().toData()).toData()).toEqual(make().toData());
  });
});

describe('LedgerEntry (append-only)', () => {
  const make = (overrides: Record<string, any> = {}) => LedgerEntry.create({
    id: 'led_1',
    deliveryJobId: 'DJB_1',
    entryType: 'BUYER_LOGISTICS_CHARGE',
    amountTzs: 13200,
    counterpartyId: 'buyer-1',
    pricingVersion: 2,
    tariffVersion: 1,
    routingVersion: 'routing-v3',
    metadata: { distanceKm: 8, durationMinutes: 25, reproducible: true },
    ...overrides,
  });

  it('stores version references and reproduction metadata', () => {
    const e = make();
    expect(e.pricingVersion).toBe(2);
    expect(e.tariffVersion).toBe(1);
    expect(e.routingVersion).toBe('routing-v3');
    expect(e.metadata.reproducible).toBe(true);
  });

  it('rejects unknown entry types', () => {
    expect(() => make({ entryType: 'MYSTERY_MONEY' })).toThrow(/entryType/);
  });

  it('accepts negative amounts (cost to party) and zero', () => {
    expect(make({ amountTzs: -4500, entryType: 'CARRIER_PAYABLE' }).amountTzs).toBe(-4500);
    expect(make({ amountTzs: 0 }).amountTzs).toBe(0);
  });

  it('rejects missing pricingVersion', () => {
    expect(() => make({ pricingVersion: -1 })).toThrow(/pricingVersion/);
  });

  it('toData output rebuilds an equivalent append-only record', () => {
    expect(new LedgerEntry(make().toData()).toData()).toEqual(make().toData());
  });
});

describe('FulfillmentCommitment (price lock)', () => {
  const make = () => FulfillmentCommitment.create({
    id: 'cmt_1',
    checkoutSessionId: 'sess_1',
    quoteId: 'qte_1',
    buyerPriceTzs: 13200,
    pricingVersion: 2,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  it('starts LOCKED with the buyer price frozen', () => {
    const c = make();
    expect(c.status).toBe('LOCKED');
    expect(c.buyerPriceTzs).toBe(13200);
    expect(c.isLocked).toBe(true);
  });

  it('transitions LOCKED → CONSUMED and LOCKED → EXPIRED, then dead-ends', () => {
    const consumed = make();
    consumed.consume();
    expect(consumed.status).toBe('CONSUMED');
    expect(() => consumed.consume()).toThrow(/CONSUMED → CONSUMED/);

    const expired = make();
    expired.expire();
    expect(expired.status).toBe('EXPIRED');
    expect(() => expired.consume()).toThrow(/EXPIRED → CONSUMED/);
  });

  it('rejects a negative locked price and non-future expiry', () => {
    expect(() => FulfillmentCommitment.create({
      id: 'cmt_2', checkoutSessionId: 's', quoteId: 'q', buyerPriceTzs: -1, pricingVersion: 1,
      expiresAt: new Date(Date.now() + 1000),
    })).toThrow(/cannot be negative/);
    expect(() => FulfillmentCommitment.create({
      id: 'cmt_3', checkoutSessionId: 's', quoteId: 'q', buyerPriceTzs: 100, pricingVersion: 1,
      lockedAt: new Date('2026-09-04T12:00:00Z'), expiresAt: new Date('2026-09-04T11:00:00Z'),
    })).toThrow(/expiresAt must be after lockedAt/);
  });
});