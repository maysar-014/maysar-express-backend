import { EventEnvelope, Money, OrderStatus, UUID } from './types';

export namespace OrderService {
    export namespace Events {
        export interface OrderCreated {
            orderId: UUID;
            userId: UUID;
            items: Array<{ productId: UUID; quantity: number; price: Money }>;
            totalAmount: Money;
            createdAt: Date;
        }

        export interface OrderCancelled {
            orderId: UUID;
            reason: string;
            cancelledAt: Date;
        }

        export interface OrderCompleted {
            orderId: UUID;
            completedAt: Date;
        }
    }

    export namespace Commands {
        export interface CreateOrder {
            userId: UUID;
            items: Array<{ productId: UUID; quantity: number }>;
            shippingAddressId: UUID;
        }

        export interface CancelOrder {
            orderId: UUID;
            reason: string;
        }

        export interface CompleteOrder {
            orderId: UUID;
        }
    }
}
