export class FacilitateOrderDto {
    enablerId!: string;
    listingId!: string;
    buyerId!: string;
    quantity!: number;
    shippingAddressId?: string;
    billingAddressId?: string;
}

export class EnablerOrderResponseDto {
    id!: string;
    orderId!: string;
    enablerId!: string;
    status!: string;
    orderAmount!: number;
    enablerCommission!: number;
    settlementStatus!: string;
    createdAt!: Date;
}

export class CommissionBreakdownDto {
    baseCommission!: number;
    tierBonus!: number;
    performanceBonus!: number;
    totalCommission!: number;
    commissionRate!: number;
}
