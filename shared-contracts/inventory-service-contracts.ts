import { UUID, Money } from './types';

export namespace InventoryService {
    export namespace Events {
        export interface StockReserved {
            reservationId: UUID;
            orderId: UUID;
            items: Array<{ productId: UUID; quantity: number }>;
            expiresAt: Date;
        }

        export interface StockReleased {
            reservationId: UUID;
            reason: string;
            releasedAt: Date;
        }

        export interface StockAdjusted {
            productId: UUID;
            quantityDelta: number;
            newLevel: number;
            reason: string;
            adjustedAt: Date;
        }
    }

    export namespace Commands {
        export interface ReserveStock {
            orderId: UUID;
            items: Array<{ productId: UUID; quantity: number }>;
        }

        export interface ReleaseStock {
            reservationId: UUID;
            reason: string;
        }

        export interface AdjustStock {
            productId: UUID;
            quantityDelta: number;
            reason: string;
        }
    }
}
