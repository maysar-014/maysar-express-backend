export namespace PricingService {
    export namespace Commands {
        export interface CalculatePrice {
            baseCost: number;
            desiredProfit?: number;
            productCategory: string;
            condition: 'new' | 'used' | 'refurbished';
            commissionPercentage: number;
            paymentGatewayPercentage: number;
            minimumSellerMarginPercentage: number;
            minimumPlatformMarginPercentage: number;
            deliverySubsidy?: number;
            phase: 'phase1' | 'phase2' | 'phase3';
            market?: {
                marketAveragePrice?: number;
                competitorPrices?: number[];
                demandLevel?: 'low' | 'medium' | 'high';
                salesVelocity?: number;
            };
        }
    }

    export namespace Events {
        export interface PriceCalculated {
            productId: string;
            finalPrice: number;
            sellerNetRevenue: number;
            sellerProfit: number;
            platformRevenue: number;
            isHealthy: boolean;
            adjustments: string[];
            warnings: string[];
            calculatedAt: Date;
        }
    }
}
