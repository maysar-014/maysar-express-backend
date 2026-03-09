import type {
  CommissionBreakdownDto,
  EnablerOrderResponseDto,
  FacilitateOrderDto
} from './enabler-order.dto';

describe('enabler-order DTO contracts', () => {
  it('supports facilitate-order request payloads', () => {
    const dto: FacilitateOrderDto = {
      enablerId: 'enabler-1',
      listingId: 'listing-1',
      buyerId: 'buyer-1',
      quantity: 3,
      shippingAddressId: 'ship-1'
    };

    expect(dto.quantity).toBe(3);
    expect(dto.shippingAddressId).toBe('ship-1');
  });

  it('supports enabler-order response and commission breakdown payloads', () => {
    const order: EnablerOrderResponseDto = {
      id: 'eo-1',
      orderId: 'order-1',
      enablerId: 'enabler-1',
      status: 'COMPLETED',
      orderAmount: 150000,
      enablerCommission: 24000,
      settlementStatus: 'PENDING',
      createdAt: new Date('2026-02-01T00:00:00.000Z')
    };
    const commission: CommissionBreakdownDto = {
      baseCommission: 20000,
      tierBonus: 2000,
      performanceBonus: 2000,
      totalCommission: 24000,
      commissionRate: 0.16
    };

    expect(order.status).toBe('COMPLETED');
    expect(commission.totalCommission).toBe(24000);
  });
});
