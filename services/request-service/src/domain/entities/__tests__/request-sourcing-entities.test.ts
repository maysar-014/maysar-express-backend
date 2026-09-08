/**
 * Request_Item / Request_Supplier / Request_Source / Request_Procurement
 * entity invariants (Phase 2 §2.1–2.3 acceptance).
 */

import { RequestItem } from '../request-item.entity';
import { RequestSupplier } from '../request-supplier.entity';
import { RequestSource } from '../request-source.entity';
import { RequestProcurement } from '../request-procurement.entity';

describe('RequestItem invariants (§2.1, §B-1)', () => {
  const base = {
    requestId: 'req_x',
    description: 'Hikvision-compatible CCTV camera',
    quantity: 8,
    unitPriceTzs: 120000,
  };

  it('non-catalog item persists with NO catalogProductId', () => {
    const item = RequestItem.create({ ...base, sourceType: 'EXTERNAL_SUPPLIER' });
    expect(item.sourceType).toBe('EXTERNAL_SUPPLIER');
    expect(item.catalogProductId).toBeNull();
    expect(item.id.startsWith('RIT_')).toBe(true);
  });

  it('catalog-sourced item REQUIRES catalogProductId', () => {
    expect(() => RequestItem.create({ ...base, sourceType: 'CATALOG_PRODUCT' })).toThrow(
      'CATALOG_PRODUCT items must carry catalogProductId',
    );
    const ok = RequestItem.create({ ...base, sourceType: 'CATALOG_PRODUCT', catalogProductId: 'cat_123' });
    expect(ok.catalogProductId).toBe('cat_123');
  });

  it('non-catalog source types REJECT a catalogProductId (structural §B-1)', () => {
    expect(() => RequestItem.create({ ...base, sourceType: 'KNOWN_SUPPLIER', catalogProductId: 'cat_123' })).toThrow(
      'only CATALOG_PRODUCT items may carry catalogProductId',
    );
  });

  it('quantity must be > 0 and price ≥ 0', () => {
    expect(() => RequestItem.create({ ...base, quantity: 0 })).toThrow('quantity must be > 0');
    expect(() => RequestItem.create({ ...base, unitPriceTzs: -1 })).toThrow('unitPriceTzs must be ≥ 0');
  });

  it('unknown sourceType is rejected', () => {
    expect(() => RequestItem.create({ ...base, sourceType: 'SOMETHING' as any })).toThrow('unknown sourceType');
  });

  it('bindToQuote binds once; rebinding to another quote is rejected', () => {
    const item = RequestItem.create(base);
    expect(item.quoteId).toBeNull();
    item.bindToQuote('rqt_a');
    expect(item.quoteId).toBe('rqt_a');
    expect(() => item.bindToQuote('rqt_b')).toThrow('already bound');
    item.bindToQuote('rqt_a'); // same quote is a no-op
  });
});

describe('RequestSupplier invariants (§2.2)', () => {
  it('KNOWN supplier cannot carry discoveredViaRequestId', () => {
    expect(() =>
      RequestSupplier.create({ name: 'A', contact: { phone: 'x' }, source: 'KNOWN', discoveredViaRequestId: 'req_1' }),
    ).toThrow('KNOWN suppliers cannot carry');
  });

  it('DISCOVERED supplier REQUIRES its originating request reference', () => {
    expect(() => RequestSupplier.create({ name: 'A', contact: { phone: 'x' }, source: 'DISCOVERED' })).toThrow(
      'DISCOVERED suppliers need discoveredViaRequestId',
    );
    const s = RequestSupplier.create({
      name: 'Discovered Supplier',
      contact: { whatsapp: '+255...' },
      source: 'DISCOVERED',
      discoveredViaRequestId: 'req_9',
    });
    expect(s.discoveredViaRequestId).toBe('req_9');
    expect(s.id.startsWith('SUP_')).toBe(true);
  });

  it('requires at least one contact method', () => {
    expect(() => RequestSupplier.create({ name: 'A', contact: {} })).toThrow('at least one contact method');
  });
});

describe('RequestSource invariants (§2.2)', () => {
  it('availability transitions + usable window', () => {
    const s = RequestSource.create({ itemId: 'rit_1', supplierId: 'sup_1', agreedPriceTzs: 1000 });
    expect(s.availability).toBe('PENDING');
    expect(s.isUsable()).toBe(false);
    s.confirm(new Date(Date.now() + 86400000));
    expect(s.isUsable()).toBe(true);
    s.markUnavailable();
    expect(s.isUsable()).toBe(false);
  });

  it('an expired availableUntil is NOT usable (expired supplier price)', () => {
    const s = RequestSource.create({
      itemId: 'rit_1',
      supplierId: 'sup_1',
      agreedPriceTzs: 1000,
      availability: 'CONFIRMED',
      availableUntil: new Date(Date.now() - 1000),
    });
    expect(s.isUsable()).toBe(false);
  });

  it('MAYSAR_INVENTORY source has null supplierId and can be CONFIRMED', () => {
    const s = RequestSource.create({ itemId: 'rit_2', supplierId: null, agreedPriceTzs: 500, availability: 'CONFIRMED' });
    expect(s.supplierId).toBeNull();
    expect(s.isUsable()).toBe(true);
  });
});

describe('RequestProcurement state machine (§2.3)', () => {
  it('PENDING → ORDERED → RECEIVED with timestamps', () => {
    const p = RequestProcurement.create({ orderId: 'ord_1', itemId: 'rit_1', supplierId: 'sup_1', agreedPriceTzs: 900 });
    expect(p.procurementStatus).toBe('PENDING');
    p.markOrdered();
    expect(p.procurementStatus).toBe('ORDERED');
    expect(p.orderedAt).not.toBeNull();
    p.markReceived();
    expect(p.procurementStatus).toBe('RECEIVED');
    expect(p.receivedAt).not.toBeNull();
  });

  it('illegal transitions are rejected', () => {
    const p = RequestProcurement.create({ orderId: 'ord_1', itemId: 'rit_1', supplierId: 'sup_1', agreedPriceTzs: 900 });
    expect(() => p.markReceived()).toThrow('only ORDERED can be received');
    p.markOrdered();
    expect(() => p.markOrdered()).toThrow('only PENDING can be ordered');
  });

  it('FAILED requires a reason and is reachable from PENDING or ORDERED', () => {
    const p = RequestProcurement.create({ orderId: 'ord_1', itemId: 'rit_1', supplierId: 'sup_1', agreedPriceTzs: 900 });
    p.markFailed('Supplier went out of stock');
    expect(p.procurementStatus).toBe('FAILED');
    expect(p.notes).toBe('Supplier went out of stock');
    const q = RequestProcurement.create({ orderId: 'ord_2', itemId: 'rit_2', supplierId: 'sup_1', agreedPriceTzs: 900 });
    q.markOrdered();
    q.markFailed('Damaged in transit');
    expect(q.procurementStatus).toBe('FAILED');
    const r = RequestProcurement.create({ orderId: 'ord_3', itemId: 'rit_3', supplierId: 'sup_1', agreedPriceTzs: 900 });
    r.markOrdered();
    r.markReceived();
    expect(() => r.markFailed('late')).toThrow('cannot fail');
  });
});