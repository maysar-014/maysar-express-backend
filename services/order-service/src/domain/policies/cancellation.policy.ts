export interface CancellationResult {
  allowed: boolean;
  reason?: string;
  requiresSellerConsent?: boolean;
}

export type CancellationRequester = 'buyer' | 'seller' | 'system';

export interface CancellationCandidateOrder {
  id: string;
  buyerId?: string;
  sellerId?: string;
  status: string;
  createdAt?: Date;
}

export class CancellationPolicy {
  canCancelOrder(params: {
    order: CancellationCandidateOrder | null | undefined;
    requestedBy: CancellationRequester;
    requesterUserId?: string;
  }): CancellationResult {
    const { order, requestedBy, requesterUserId } = params;

    if (!order) {
      return { allowed: false, reason: 'Order not found' };
    }

    if (requestedBy === 'system') {
      return { allowed: true };
    }

    const normalizedStatus = String(order.status || '').trim().toLowerCase();
    if (!['pending', 'confirmed'].includes(normalizedStatus)) {
      return { allowed: false, reason: 'Order cannot be cancelled in current status' };
    }

    if (requestedBy === 'buyer') {
      if (requesterUserId && order.buyerId && requesterUserId !== order.buyerId) {
        return { allowed: false, reason: 'Only the buyer who created the order can cancel it' };
      }

      if (normalizedStatus === 'pending') {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: 'Seller consent is required after the order is confirmed',
        requiresSellerConsent: true
      };
    }

    if (requestedBy === 'seller') {
      if (requesterUserId && order.sellerId && requesterUserId !== order.sellerId) {
        return { allowed: false, reason: 'Only the seller assigned to the order can issue this cancellation' };
      }

      return { allowed: true };
    }

    return { allowed: false, reason: 'Invalid cancellation request' };
  }
}
