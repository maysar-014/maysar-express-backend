export class SellerPricingInput {
    constructor(
        public readonly baseCost: number,
        public readonly productCategory: string,
        public readonly condition: 'new' | 'used' | 'refurbished',
        public readonly desiredProfit?: number
    ) {
        if (baseCost <= 0) throw new Error('Base cost must be positive');
        if (!productCategory || productCategory.trim() === '') throw new Error('Product category is required');
        if (!['new', 'used', 'refurbished'].includes(condition)) throw new Error('Invalid condition');
        if (desiredProfit !== undefined && desiredProfit < 0) throw new Error('Desired profit cannot be negative');
    }

    getEffectiveDesiredProfit(minimumMarginPct: number): number {
        return this.desiredProfit ?? this.baseCost * minimumMarginPct;
    }
}
