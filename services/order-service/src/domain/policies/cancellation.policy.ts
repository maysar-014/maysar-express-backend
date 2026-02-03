export interface CancellationResult {
  allowed: boolean;
  reason?: string;
  penalty?: number;
}

export class CancellationPolicy {
  async canCancelOrder(orderId: string, requestedBy: 'buyer' | 'seller' | 'system'): Promise<CancellationResult> {
    const order = await this.getOrder(orderId);
    
    if (!order) {
      return { allowed: false, reason: 'Order not found' };
    }

    // System can always cancel
    if (requestedBy === 'system') {
      return { allowed: true };
    }

    // Check order status
    if (!['pending', 'confirmed'].includes(order.status)) {
      return { allowed: false, reason: 'Order cannot be cancelled in current status' };
    }

    // Time-based restrictions
    const orderAge = Date.now() - order.createdAt.getTime();
    const maxCancellationTime = 30 * 60 * 1000; // 30 minutes

    if (orderAge > maxCancellationTime && order.status === 'confirmed') {
      return { allowed: false, reason: 'Cancellation window expired' };
    }

    // Buyer cancellation rules
    if (requestedBy === 'buyer') {
      if (order.paymentMethod === 'COD') {
        return { allowed: true };
      } else {
        // Digital payment may have processing fees
        return { allowed: true, penalty: order.totalAmount * 0.02 };
      }
    }

    // Seller cancellation rules
    if (requestedBy === 'seller') {
      const penalty = this.calculateSellerCancellationPenalty(order);
      return { allowed: true, penalty };
    }

    return { allowed: false, reason: 'Invalid cancellation request' };
  }

  private calculateSellerCancellationPenalty(order: any): number {
    // Seller penalty based on order value and timing
    const basePenalty = Math.min(order.totalAmount * 0.05, 10000); // 5% or max 10,000 TZS
    return basePenalty;
  }

  private async getOrder(orderId: string): Promise<any> {
    // Integration with order repository
    return null; // Placeholder
  }
}