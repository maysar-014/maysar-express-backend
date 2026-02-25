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
}
