import { UUID, Money } from './types';

export namespace CatalogService {
    export namespace Events {
        export interface ProductPublished {
            productId: UUID;
            name: string;
            price: Money;
            publishedAt: Date;
        }

        export interface ProductUnpublished {
            productId: UUID;
            reason: string;
            unpublishedAt: Date;
        }

        export interface PriceUpdated {
            productId: UUID;
            oldPrice: Money;
            newPrice: Money;
            updatedAt: Date;
        }

        export interface BuyBoxComputed {
            productId: UUID;
            primarySellerId: UUID | null;
            primaryScore: number | null;
            alternativeCount: number;
            computedAt: Date;
        }
    }

    export namespace Commands {
        export interface PublishProduct {
            productId: UUID;
        }

        export interface UnpublishProduct {
            productId: UUID;
            reason: string;
        }

        export interface UpdatePrice {
            productId: UUID;
            price: Money;
        }
    }

    export namespace Campaign {
        export namespace Events {
            export interface CampaignStarted {
                campaignId: UUID;
                name: string;
                startedAt: Date;
            }

            export interface CampaignEnded {
                campaignId: UUID;
                reason: string;
                endedAt: Date;
            }
        }

        export namespace Commands {
            export interface StartCampaign {
                campaignId: UUID;
            }

            export interface EndCampaign {
                campaignId: UUID;
                reason: string;
            }
        }
    }

    export namespace Pricing {
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
}

