import { DiscountService } from './discount.service';

describe('DiscountService', () => {
  it('returns invalid when discount code does not exist', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new DiscountService({ appliedDiscount: { findFirst } });

    await expect(service.validateCode('NOPE')).resolves.toEqual({ valid: false });
    expect(findFirst).toHaveBeenCalledWith({
      where: { discountCode: 'NOPE' }
    });
  });

  it('returns invalid when max uses is reached', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      discountCode: 'LIMITED',
      currentUses: 3,
      maxUses: 3
    });
    const service = new DiscountService({ appliedDiscount: { findFirst } });

    await expect(service.validateCode('LIMITED')).resolves.toEqual({ valid: false });
  });

  it('returns valid and discount details when code is usable', async () => {
    const discount = {
      discountCode: 'SAVE10',
      currentUses: 1,
      maxUses: 5,
      value: 10
    };
    const findFirst = jest.fn().mockResolvedValue(discount);
    const service = new DiscountService({ appliedDiscount: { findFirst } });

    await expect(service.validateCode('SAVE10')).resolves.toEqual({
      valid: true,
      discount
    });
  });

  it('persists applied discount data', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const service = new DiscountService({ appliedDiscount: { create } });

    await service.applyDiscount('checkout-1', 'SAVE10', 10, 'percentage');

    expect(create).toHaveBeenCalledWith({
      data: {
        checkoutId: 'checkout-1',
        discountCode: 'SAVE10',
        value: 10,
        type: 'percentage'
      }
    });
  });
});
