export class PlatformEconomics {
    constructor(
        public readonly commissionPercentage: number,
        public readonly paymentGatewayPercentage: number,
        public readonly minimumSellerMarginPercentage: number,
        public readonly minimumPlatformMarginPercentage: number,
        public readonly currency: 'TZS',
        public readonly deliverySubsidy?: number
    ) {
        if (commissionPercentage < 0 || paymentGatewayPercentage < 0) throw new Error('Percentages must be positive');
        if (minimumSellerMarginPercentage < 0 || minimumPlatformMarginPercentage < 0) throw new Error('Margin percentages must be positive');
        if (commissionPercentage + paymentGatewayPercentage >= 100) throw new Error('Total deductions must be less than 100%');
        if (currency !== 'TZS') throw new Error('Only TZS currency is supported');
    }

    getTotalDeductionRate(): number {
        return (this.commissionPercentage + this.paymentGatewayPercentage) / 100;
    }
}
