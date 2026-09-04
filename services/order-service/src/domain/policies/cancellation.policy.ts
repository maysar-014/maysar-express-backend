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

    // Pre-payment verification statuses are treated like 'pending' — buyer hasn't
    // committed funds yet so cancellation is always permitted.
    const cancellableStatuses = [
      'pending',
      'pending_seller_verification',
      'seller_verified',
      'seller_declined',
      'verification_overdue',
      'confirmed',
    ];

    if (!cancellableStatuses.includes(normalizedStatus)) {
      return { allowed: false, reason: 'Order cannot be cancelled in current status' };
    }

    if (requestedBy === 'buyer') {
      if (requesterUserId && order.buyerId && requesterUserId !== order.buyerId) {
        return { allowed: false, reason: 'Only the buyer who created the order can cancel it' };
      }

      // For all pre-payment statuses, buyer can cancel immediately without seller consent.
      const buyerCancellableWithoutConsent = [
        'pending',
        'pending_seller_verification',
        'seller_verified',
        'seller_declined',
        'verification_overdue',
      ];
      if (buyerCancellableWithoutConsent.includes(normalizedStatus)) {
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
