export interface PricingResultDTO {
    finalPrice: number;
    sellerNetRevenue: number;
    sellerProfit: number;
    platformRevenue: number;
    isHealthy: boolean;
    adjustments: string[];
    warnings: string[];
}
