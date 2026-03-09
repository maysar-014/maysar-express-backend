import { Enabler_OrderStatus, Enabler_Status } from '../types/enabler.types';
import { OrderFacilitationPolicy } from './order-facilitation.policy';

describe('OrderFacilitationPolicy', () => {
  it('blocks order facilitation for invalid preconditions', () => {
    expect(
      OrderFacilitationPolicy.canFacilitateOrder({
        enablerStatus: Enabler_Status.PENDING,
        listingStatus: 'ACTIVE',
        inventoryAvailable: true,
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        enablerId: 'en-1'
      })
    ).toEqual({ allowed: false, reason: 'Enabler is not active' });

    expect(
      OrderFacilitationPolicy.canFacilitateOrder({
        enablerStatus: Enabler_Status.ACTIVE,
        listingStatus: 'PAUSED',
        inventoryAvailable: true,
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        enablerId: 'en-1'
      })
    ).toEqual({ allowed: false, reason: 'Product listing is not active' });

    expect(
      OrderFacilitationPolicy.canFacilitateOrder({
        enablerStatus: Enabler_Status.ACTIVE,
        listingStatus: 'ACTIVE',
        inventoryAvailable: false,
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        enablerId: 'en-1'
      })
    ).toEqual({ allowed: false, reason: 'Product is out of stock' });
  });

  it('blocks self-dealing and allows valid facilitation', () => {
    expect(
      OrderFacilitationPolicy.canFacilitateOrder({
        enablerStatus: Enabler_Status.ACTIVE,
        listingStatus: 'ACTIVE',
        inventoryAvailable: true,
        buyerId: 'en-1',
        sellerId: 'seller-1',
        enablerId: 'en-1'
      })
    ).toEqual({ allowed: false, reason: 'Enablers cannot facilitate orders for themselves' });

    expect(
      OrderFacilitationPolicy.canFacilitateOrder({
        enablerStatus: Enabler_Status.ACTIVE,
        listingStatus: 'ACTIVE',
        inventoryAvailable: true,
        buyerId: 'seller-1',
        sellerId: 'seller-1',
        enablerId: 'en-1'
      })
    ).toEqual({ allowed: false, reason: 'Seller cannot buy their own product via enabler' });

    expect(
      OrderFacilitationPolicy.canFacilitateOrder({
        enablerStatus: Enabler_Status.ACTIVE,
        listingStatus: 'ACTIVE',
        inventoryAvailable: true,
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        enablerId: 'en-1'
      })
    ).toEqual({ allowed: true });
  });

  it('allows cancellation only in pre-fulfillment statuses', () => {
    expect(OrderFacilitationPolicy.canCancelOrder(Enabler_OrderStatus.PENDING)).toBe(true);
    expect(OrderFacilitationPolicy.canCancelOrder(Enabler_OrderStatus.CONFIRMED)).toBe(true);
    expect(OrderFacilitationPolicy.canCancelOrder(Enabler_OrderStatus.PROCESSING)).toBe(true);
    expect(OrderFacilitationPolicy.canCancelOrder(Enabler_OrderStatus.COMPLETED)).toBe(false);
  });
});

