export type UUID = string;

export interface EventEnvelope<T = any> {
  event: string;
  version: string;
  eventId: UUID;
  producer: string;
  timestamp: string;
  payload: T;
}

export type UserRole = 'buyer' | 'seller' | 'admin';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Money {
  amount: number; // in cents
  currency: string; // e.g., 'TZS'
}
