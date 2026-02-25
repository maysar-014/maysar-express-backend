import { UUID, ShippingAddress } from './types';

export namespace LogisticsService {
    export namespace Events {
        export interface DeliveryScheduled {
            deliveryId: UUID;
            orderId: UUID;
            trackingNumber: string;
            estimatedDelivery: Date;
            courierId?: UUID;
        }

        export interface DeliveryCompleted {
            deliveryId: UUID;
            orderId: UUID;
            completedAt: Date;
            notes?: string;
        }

        export interface DeliveryFailed {
            deliveryId: UUID;
            orderId: UUID;
            reason: string;
            failedAt: Date;
        }
    }

    export namespace Commands {
        export interface ScheduleDelivery {
            orderId: UUID;
            shippingAddress: ShippingAddress;
            items: Array<{ productId: UUID; quantity: number }>;
        }

        export interface CancelDelivery {
            deliveryId: UUID;
            reason: string;
        }
    }
}
