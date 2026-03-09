import { Enabler_OrderStatus, Enabler_Status } from '../types/enabler.types';

export interface OrderContext {
    enablerStatus: Enabler_Status;
    listingStatus: string; // Enabler_ListingStatus
    inventoryAvailable: boolean;
    buyerId: string;
    sellerId: string;
    enablerId: string;
}

export class OrderFacilitationPolicy {

    static canFacilitateOrder(context: OrderContext): { allowed: boolean; reason?: string } {
        if (context.enablerStatus !== Enabler_Status.ACTIVE) {
            return { allowed: false, reason: 'Enabler is not active' };
        }

        if (context.listingStatus !== 'ACTIVE') {
            return { allowed: false, reason: 'Product listing is not active' };
        }

        if (!context.inventoryAvailable) {
            return { allowed: false, reason: 'Product is out of stock' };
        }

        if (context.buyerId === context.enablerId) {
            return { allowed: false, reason: 'Enablers cannot facilitate orders for themselves' }; // Self-dealing prevention
        }

        if (context.buyerId === context.sellerId) {
            return { allowed: false, reason: 'Seller cannot buy their own product via enabler' };
        }

        return { allowed: true };
    }

    static canCancelOrder(status: Enabler_OrderStatus): boolean {
        const cancellableStatuses: Enabler_OrderStatus[] = [
            Enabler_OrderStatus.PENDING,
            Enabler_OrderStatus.CONFIRMED,
            Enabler_OrderStatus.PROCESSING // Depends on business rule, usually until shipped
        ];
        return cancellableStatuses.includes(status);
    }
}
