import {
  CommissionEarnedEvent,
  EnablerRegisteredEvent,
  OrderFacilitatedEvent,
  ProductListedEvent,
  TaskAssignedEvent
} from './enabler-events';

describe('enabler events', () => {
  it('creates domain events with defaults and explicit timestamps', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const registered = new EnablerRegisteredEvent('en-1', 'user-1', now);
    const listed = new ProductListedEvent('list-1', 'en-1', 'prod-1');
    const facilitated = new OrderFacilitatedEvent('ord-1', 'en-1', 5000);
    const commission = new CommissionEarnedEvent('comm-1', 'en-1', 400);
    const assigned = new TaskAssignedEvent('task-1', 'en-1', 'seller-1', 'PROMOTION_JOB', 25000);

    expect(registered.timestamp).toBe(now);
    expect(listed.productId).toBe('prod-1');
    expect(facilitated.amount).toBe(5000);
    expect(commission.commissionId).toBe('comm-1');
    expect(assigned.taskType).toBe('PROMOTION_JOB');
    expect(assigned.value).toBe(25000);
    expect(listed.timestamp).toBeInstanceOf(Date);
    expect(commission.timestamp).toBeInstanceOf(Date);
  });
});
