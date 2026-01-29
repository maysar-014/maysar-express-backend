export interface IDiscountService {
  validateCode(code: string): Promise<{ valid: boolean; discount?: any }>;
  applyDiscount(checkoutId: string, code: string, value: number, type: string): Promise<void>;
}

export class DiscountService implements IDiscountService {
  constructor(private prisma: any) {}

  async validateCode(code: string): Promise<{ valid: boolean; discount?: any }> {
    const discount = await this.prisma.appliedDiscount.findFirst({
      where: { discountCode: code }
    });

    if (!discount) {
      return { valid: false };
    }

    if (discount.maxUses && discount.currentUses >= discount.maxUses) {
      return { valid: false };
    }

    return { valid: true, discount };
  }

  async applyDiscount(checkoutId: string, code: string, value: number, type: string): Promise<void> {
    await this.prisma.appliedDiscount.create({
      data: {
        checkoutId,
        discountCode: code,
        discountType: type,
        discountValue: value
      }
    });
  }
}
