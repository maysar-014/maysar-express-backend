/**
 * RequestQuote — invariants + immutability (Phase 1 §1.4 acceptance).
 */

import { RequestQuote, QuoteItem } from '../request-quote.entity';

const items: QuoteItem[] = [
  { description: 'Hikvision CCTV camera', quantity: 8, unitPriceTzs: 120000 },
];

const draftParams = {
  requestId: 'req_1',
  createdByProviderId: 'usr_provider',
  label: 'Recommended',
  items,
  procurementCostTzs: 960000,
  logisticsCostTzs: 40000,
  sellingPriceTzs: 1100000,
  deliveryDate: new Date('2026-10-01'),
  validUntil: new Date('2026-09-20'),
};

describe('RequestQuote invariants', () => {
  it('draft() starts as DRAFT with generated id', () => {
    const q = RequestQuote.draft(draftParams);
    expect(q.status).toBe('DRAFT');
    expect(q.id).toMatch(/^RQT_/);
  });

  it('rejects selling below cost', () => {
    expect(() =>
      RequestQuote.draft({ ...draftParams, sellingPriceTzs: 999999 }),
    ).toThrow('must be ≥ procurement + logistics');
  });

  it('accepts selling exactly at cost (margin 0)', () => {
    const q = RequestQuote.draft({ ...draftParams, sellingPriceTzs: 1000000 });
    expect(q.sellingPriceTzs).toBe(1000000);
  });

  it('rejects an empty items list', () => {
    expect(() => RequestQuote.draft({ ...draftParams, items: [] })).toThrow('at least one item');
  });

  it('rejects non-positive quantity', () => {
    expect(() =>
      RequestQuote.draft({ ...draftParams, items: [{ ...items[0], quantity: 0 }] }),
    ).toThrow('quantity must be > 0');
  });

  it('rejects blank item descriptions', () => {
    expect(() =>
      RequestQuote.draft({ ...draftParams, items: [{ ...items[0], description: ' ' }] }),
    ).toThrow('needs a description');
  });

  it('rejects a constructor-built non-DRAFT quote without publishedAt', () => {
    expect(
      () =>
        new RequestQuote({
          id: 'rqt_x',
          requestId: 'req_1',
          createdByProviderId: 'p',
          label: 'L',
          status: 'PUBLISHED',
          items,
          procurementCostTzs: 1,
          logisticsCostTzs: 1,
          sellingPriceTzs: 10,
          deliveryDate: new Date(),
          warrantyNote: null,
          explanation: null,
          validUntil: new Date(Date.now() + 86400000),
          publishedAt: null,
          createdAt: new Date(),
        }),
    ).toThrow('requires publishedAt');
  });
});

describe('RequestQuote lifecycle', () => {
  it('publish() transitions DRAFT → PUBLISHED and stamps publishedAt', () => {
    const q = RequestQuote.draft(draftParams);
    const before = new Date();
    q.publish();
    expect(q.status).toBe('PUBLISHED');
    expect(q.publishedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
  });

  it('publish() rejects a quote whose validUntil has already passed', () => {
    const q = RequestQuote.draft({
      ...draftParams,
      validUntil: new Date(Date.now() - 1000),
    });
    expect(() => q.publish()).toThrow('validUntil has already passed');
  });

  it('only DRAFT quotes can be published', () => {
    const q = RequestQuote.draft(draftParams);
    q.publish();
    expect(() => q.publish()).toThrow('only DRAFT quotes can be published');
  });

  it('only PUBLISHED quotes can be converted', () => {
    const q = RequestQuote.draft(draftParams);
    expect(() => q.markConverted()).toThrow('only PUBLISHED quotes can be converted');
    q.publish();
    q.markConverted();
    expect(q.status).toBe('CONVERTED');
  });

  it('PUBLISHED → SUPERSEDED (replacement flow)', () => {
    const q = RequestQuote.draft(draftParams);
    q.publish();
    q.supersede();
    expect(q.status).toBe('SUPERSEDED');
  });

  it('CONVERTED cannot be superseded or expired (terminal)', () => {
    const q = RequestQuote.draft(draftParams);
    q.publish();
    q.markConverted();
    expect(() => q.supersede()).toThrow('cannot supersede');
    expect(() => q.markExpired()).toThrow('cannot expire');
  });
});