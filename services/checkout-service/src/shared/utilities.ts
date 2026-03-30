/**
 * Shared Utilities
 * Common utilities for the checkout service
 */

import { randomUUID } from 'crypto';

export class EventStore {
  async append(_event: any): Promise<void> {
    // Implementation
  }

  async getEvents(_aggregateId: string): Promise<any[]> {
    // Implementation
    return [];
  }
}

export class HealthCheck {
  async check(): Promise<{ status: string }> {
    // Implementation
    return { status: 'healthy' };
  }
}

export class OptimisticLock {
  async acquire(_key: string): Promise<boolean> {
    // Implementation
    return true;
  }

  async release(_key: string): Promise<void> {
    // Implementation
  }
}

export class TransactionManager {
  async begin(): Promise<void> {
    // Implementation
  }

  async commit(): Promise<void> {
    // Implementation
  }

  async rollback(): Promise<void> {
    // Implementation
  }
}

export interface PricedItem {
  price: number;
  quantity: number;
}

export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}

export function calculateTotal(items: PricedItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function generateId(): string {
  return randomUUID().toLowerCase();
}
