export interface ShippingAddress {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
}

export type UUID = string;

export interface EventEnvelope<T = any> {
  event: string;
  version: string;
  eventId: UUID;
  producer: string;
  timestamp: string;
  payload: T;
}

/**
 * User roles available in the system.
 * Note: The authoritative role definition is in user-service-contracts.ts (UserRole enum).
 * This type alias provides a string union for type safety in contexts where the enum isn't imported.
 */
export type UserRole = 'buyer' | 'seller' | 'supplier' | 'courier' | 'enabler' | 'system';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Money {
  amount: number; // in cents
  currency: string; // e.g., 'TZS'
}
