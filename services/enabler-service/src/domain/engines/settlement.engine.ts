export interface SettlementInput {
    orderAmount: number;
    commissionAmount: number;
    platformFee: number;
    taxAmount?: number;
    shippingCost?: number;
    sellerId: string;
    enablerId: string;
}

export interface SettlementBreakdown {
    sellerPayout: number;
    enablerPayout: number;
    platformRevenue: number;
    taxRemittance: number;
    shippingRemittance: number;
    holdPeriodDays: number;
    payoutDate: Date;
}

/**
 * SettlementEngine - Calculates payout amounts and schedules
 * Pure business logic for financial settlement
 */
export class SettlementEngine {
    private static readonly DEFAULT_HOLD_PERIOD_DAYS = 7;
    private static readonly EXTENDED_HOLD_PERIOD_DAYS = 14;
    private static readonly NEW_ENABLER_HOLD_PERIOD_DAYS = 14;

    /**
     * Calculate settlement breakdown
     */
    static calculateSettlement(input: SettlementInput, isNewEnabler: boolean = false): SettlementBreakdown {
        // Platform revenue includes the fee + any leftover
        // Typically platform fee is deducted from the gross amount before splitting

        // In this model:
        // Total = SellerPayout + EnablerPayout + PlatformFee + Tax + Shipping

        // Assuming orderAmount includes product price + shipping + tax
        // But commission is usually calculated on product price only

        const tax = input.taxAmount || 0;
        const shipping = input.shippingCost || 0;

        // Revenue to distribute (Order Total - Tax - Shipping)
        // Note: In some models, commission is on shipping too, but safely assume product only here
        const DistributableAmount = input.orderAmount - tax - shipping;

        // Ensure we don't pay out more than we collected
        const totalPayouts = input.commissionAmount + input.platformFee;
        const sellerPayout = DistributableAmount - totalPayouts;

        if (sellerPayout < 0) {
            throw new Error('Invalid settlement: Payouts exceed order amount');
        }

        const holdPeriod = this.calculateHoldPeriod(isNewEnabler, input.orderAmount);
        const payoutDate = new Date();
        payoutDate.setDate(payoutDate.getDate() + holdPeriod);

        return {
            sellerPayout: this.roundToTwoDecimals(sellerPayout),
            enablerPayout: this.roundToTwoDecimals(input.commissionAmount),
            platformRevenue: this.roundToTwoDecimals(input.platformFee),
            taxRemittance: this.roundToTwoDecimals(tax),
            shippingRemittance: this.roundToTwoDecimals(shipping),
            holdPeriodDays: holdPeriod,
            payoutDate: payoutDate
        };
    }

    /**
     * Calculate hold period based on risk factors
     */
    private static calculateHoldPeriod(isNewEnabler: boolean, amount: number): number {
        if (isNewEnabler) {
            return this.NEW_ENABLER_HOLD_PERIOD_DAYS;
        }

        if (amount > 1000000) { // High value order (e.g. 1M TZS)
            return this.EXTENDED_HOLD_PERIOD_DAYS;
        }

        return this.DEFAULT_HOLD_PERIOD_DAYS;
    }

    private static roundToTwoDecimals(value: number): number {
        return Math.round(value * 100) / 100;
    }
}
