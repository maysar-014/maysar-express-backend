/**
 * RequestEntity — state-machine + invariants (Phase 1 §1.1 acceptance).
 */

import { RequestEntity, RequestStatus } from '../request.entity';

const base = {
  customerId: 'usr_customer',
  title: 'CCTV setup',
  description: 'Nahitaji vifaa vya CCTV kwa biashara yangu',
  deliveryAddress: { city: 'Dar es Salaam', region: 'Dar es Salaam' },
};

const make = (status: RequestStatus, extra: Record<string, unknown> = {}): RequestEntity =>
  new RequestEntity({
    id: 'req_test',
    title: base.title,
    description: base.description,
    customerId: base.customerId,
    deliveryAddress: base.deliveryAddress,
    preferredDeliveryDate: null,
    budgetTzs: null,
    attachments: null,
    status,
    assignedProviderId: null,
    unfulfillableReason: null,
    orderId: null,
    convertedQuoteId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  } as any);

describe('RequestEntity invariants', () => {
  it('create() starts in SUBMITTED with generated id', () => {
    const r = RequestEntity.create({ ...base });
    expect(r.status).toBe('SUBMITTED');
    expect(r.id).toMatch(/^REQ_/);
  });

  it('rejects blank description', () => {
    expect(() => RequestEntity.create({ ...base, description: '   ' })).toThrow('description must be non-blank');
  });

  it('rejects missing customerId', () => {
    expect(() => RequestEntity.create({ ...base, customerId: '' })).toThrow('customerId is required');
  });

  it('UNFULFILLABLE requires unfulfillableReason', () => {
    expect(() => make('UNFULFILLABLE')).toThrow('UNFULFILLABLE requires unfulfillableReason');
  });

  it('CONVERTED requires orderId and convertedQuoteId', () => {
    expect(() => make('CONVERTED')).toThrow('CONVERTED requires orderId and convertedQuoteId');
  });
});

describe('RequestEntity state machine — legal transitions', () => {
  it('SUBMITTED → ASSESSING', () => {
    const r = make('SUBMITTED');
    r.markAssessing();
    expect(r.status).toBe('ASSESSING');
  });

  it('ASSESSING → NEEDS_CLARIFICATION → ASSESSING → FULFILLABLE', () => {
    const r = make('ASSESSING');
    r.markNeedsClarification();
    expect(r.status).toBe('NEEDS_CLARIFICATION');
    r.markAssessing();
    expect(r.status).toBe('ASSESSING');
    r.markFulfillable();
    expect(r.status).toBe('FULFILLABLE');
  });

  it('ASSESSING → UNFULFILLABLE records the reason', () => {
    const r = make('ASSESSING');
    r.markUnfulfillable('Product unavailable in the region');
    expect(r.status).toBe('UNFULFILLABLE');
    expect(r.unfulfillableReason).toBe('Product unavailable in the region');
  });

  it('FULFILLABLE → QUOTE_PUBLISHED → CONVERTED', () => {
    const r = make('FULFILLABLE');
    r.markQuotePublished();
    expect(r.status).toBe('QUOTE_PUBLISHED');
    r.markConverted('order_1', 'rqt_1');
    expect(r.status).toBe('CONVERTED');
    expect(r.orderId).toBe('order_1');
  });

  it('FULFILLABLE / QUOTE_PUBLISHED → ASSESSING (quote-expiry reassessment, §4.1)', () => {
    for (const status of ['FULFILLABLE', 'QUOTE_PUBLISHED'] as RequestStatus[]) {
      const r = make(status);
      r.returnToAssessing();
      expect(r.status).toBe('ASSESSING');
    }
  });

  it('customer can cancel from all four cancellable states', () => {
    for (const status of ['SUBMITTED', 'ASSESSING', 'NEEDS_CLARIFICATION', 'QUOTE_PUBLISHED'] as RequestStatus[]) {
      const r = make(status);
      r.markCancelled();
      expect(r.status).toBe('CANCELLED');
    }
  });

  it('EXPIRED reachable from pre-CONVERTED states', () => {
    for (const status of ['SUBMITTED', 'ASSESSING', 'NEEDS_CLARIFICATION', 'FULFILLABLE', 'QUOTE_PUBLISHED'] as RequestStatus[]) {
      const r = make(status);
      r.markExpired();
      expect(r.status).toBe('EXPIRED');
    }
  });

  it('assignProvider sets the provider without a status change', () => {
    const r = make('SUBMITTED');
    r.assignProvider('usr_provider');
    expect(r.assignedProviderId).toBe('usr_provider');
    expect(r.status).toBe('SUBMITTED');
  });
});

describe('RequestEntity state machine — illegal transitions throw', () => {
  it('SUBMITTED → CONVERTED is illegal', () => {
    const r = make('SUBMITTED');
    expect(() => r.markConverted('order_1', 'rqt_1')).toThrow('not a legal transition');
  });

  it('CONVERTED is terminal', () => {
    const r = make('CONVERTED', { orderId: 'o1', convertedQuoteId: 'q1' });
    expect(() => r.markCancelled()).toThrow('not a legal transition');
    expect(() => r.markExpired()).toThrow('not a legal transition');
  });

  it('UNFULFILLABLE is terminal', () => {
    const r = make('UNFULFILLABLE', { unfulfillableReason: 'x' });
    expect(() => r.markAssessing()).toThrow('not a legal transition');
    expect(() => r.markExpired()).toThrow('not a legal transition');
  });

  it('CANCELLED is terminal', () => {
    const r = make('CANCELLED');
    expect(() => r.markAssessing()).toThrow('not a legal transition');
  });

  it('returnToAssessing is illegal from terminal states', () => {
    const r = make('CANCELLED');
    expect(() => r.returnToAssessing()).toThrow('not a legal transition');
  });

  it('markUnfulfillable with a blank reason throws', () => {
    const r = make('ASSESSING');
    expect(() => r.markUnfulfillable('  ')).toThrow('UNFULFILLABLE requires unfulfillableReason');
  });
});