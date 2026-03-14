/**
 * Discount Service
 * 
 * Validates and applies discount codes.
 * Infrastructure layer - external service integration.
 */

export interface DiscountValidationResult {
  valid: boolean;
  discount?: any;
}

export class DiscountService {
  constructor(private prisma: any) {}

  async validateCode(code: string): Promise<DiscountValidationResult> {
    const discount = await this.prisma.checkout_AppliedDiscount.findFirst({
      where: { discountCode: code }
    });

    if (!discount) {
      return { valid: false };
    }

    // Check if discount is expired (max uses reached)
    if (discount.maxUses && discount.currentUses >= discount.maxUses) {
      return { valid: false };
    }

    return { valid: true, discount };
  }

  async applyDiscount(
    checkoutId: string,
    code: string,
    value: number,
    type: 'fixed' | 'percentage'
  ): Promise<void> {
    await this.prisma.checkout_AppliedDiscount.create({
      data: {
        checkoutId,
        discountCode: code,
        discountValue: value,
        discountType: type
      }
    });
  }
}
