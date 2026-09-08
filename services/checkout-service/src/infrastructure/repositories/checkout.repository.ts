/**
 * Checkout Repository
 * Handles checkout session persistence
 */

export interface CheckoutSession {
  id: string;
  cartId: string;
  userId: string;
  enablerId?: string;
  enablerCode?: string;
  shippingAddressId: string;
  billingAddressId: string;
  shippingMethodId: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount?: number;
  status?: string;
  paymentMethodId?: string;
  paymentStatus?: string;
  metadata?: Record<string, unknown>;
  /** Buyer's delivery-window preference (Phase 4 §4.1): FLEXIBLE | STANDARD | EXPRESS. */
  deliveryWindowPreference?: 'FLEXIBLE' | 'STANDARD' | 'EXPRESS';
  items?: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    priceAtTime: number;
  }>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class CheckoutRepository {
  private sessions: Map<string, CheckoutSession> = new Map();

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getSession(sessionId: string): Promise<CheckoutSession | null> {
    return this.getCheckoutSession(sessionId);
  }

  async saveCheckoutSession(session: CheckoutSession): Promise<void> {
    const now = new Date();
    this.sessions.set(session.id, {
      ...session,
      updatedAt: now
    });
  }

  async saveSession(session: CheckoutSession): Promise<void> {
    await this.saveCheckoutSession(session);
  }

  async deleteCheckoutSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async clearExpiredSessions(now: Date = new Date()): Promise<void> {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
