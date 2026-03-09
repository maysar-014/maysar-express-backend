import { EnablerOrderEntity, EnablerOrderProps } from './enabler-order.entity';
import { Enabler_OrderStatus } from '../types/enabler.types';

describe('EnablerOrderEntity', () => {
  const baseProps: EnablerOrderProps = {
    id: 'eo-1',
    enablerId: 'en-1',
    orderId: 'o-1',
    sellerId: 'seller-1',
    buyerId: 'buyer-1',
    productListingId: 'pl-1',
    status: Enabler_OrderStatus.PENDING,
    orderAmount: 1000,
    productAmount: 800,
    enablerCommission: 180,
    platformFee: 20,
    commissionRate: 0.15,
    tierBonus: 20,
    performanceBonus: 10,
    settlementStatus: 'pending',
    disputeStatus: 'none',
    metadata: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  };

  it('calculates commission breakdown and supports lifecycle transitions', () => {
    const order = EnablerOrderEntity.create({ ...baseProps });

    expect(order.calculateCommissionBreakdown()).toEqual({
      baseCommission: 150,
      tierBonus: 20,
      performanceBonus: 10,
      totalCommission: 180,
      sellerPayout: 800,
      platformFee: 20
    });

    order.confirm();
    order.startProcessing();
    order.complete();
    expect(order.status).toBe(Enabler_OrderStatus.COMPLETED);
  });

  it('enforces cancellation rules', () => {
    const cancellable = EnablerOrderEntity.create({ ...baseProps, status: Enabler_OrderStatus.CONFIRMED });
    expect(cancellable.canBeCancelled()).toBe(true);
    cancellable.cancel('buyer requested');
    expect(cancellable.status).toBe(Enabler_OrderStatus.CANCELLED);
    expect(cancellable.validateInventoryAvailability()).toBe(false);

    const nonCancellable = EnablerOrderEntity.create({ ...baseProps, status: Enabler_OrderStatus.PROCESSING });
    expect(() => nonCancellable.cancel('late')).toThrow('Order cannot be cancelled in current state');
  });

  it('handles disputes and settlement flags', () => {
    const order = EnablerOrderEntity.create({ ...baseProps, status: Enabler_OrderStatus.CONFIRMED });

    expect(order.canBeDisputed()).toBe(true);
    order.raiseDispute('damaged');
    expect(order.status).toBe(Enabler_OrderStatus.DISPUTED);
    order.resolveDispute('refund');
    expect(order.toPlainObject().disputeStatus).toBe('resolved');

    order.markSellerPaid();
    expect(order.settlementStatus).toBe('processing');
    order.markEnablerPaid();
    expect(order.isSettled()).toBe(true);
  });
});
