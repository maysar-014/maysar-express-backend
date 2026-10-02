/**
 * Seller-consent cancellation workflow.
 *
 * `CancellationPolicy` deliberately refuses a buyer cancelling an already-PAID
 * (CONFIRMED) order and flags `requiresSellerConsent`. That flag was a dead end:
 * no endpoint implemented consent, so the buyer's only options were to abandon
 * the order or escalate out of band, and `docs/FLOWS/order/user-flow/buyer-flows.md`
 * promised a refund the API could not deliver.
 *
 * This implements the missing consent conversation. It deliberately does NOT
 * change the policy: a seller who has already accepted and been paid is not
 * exposed to a unilateral buyer refund before dispatch. What was missing was the
 * mechanism, not the rule.
 *
 * State is persisted on the order (migration 20260928040000) so a decision
 * survives a restart and remains auditable.
 */

export type ConsentStatus = 'PENDING_SELLER' | 'APPROVED' | 'DECLINED';

export interface ConsentOrderSnapshot {
    id: string;
    buyerId?: string;
    sellerId?: string;
    status: string;
    cancelRequestStatus?: string | null;
}

export interface CancellationConsentStore {
    findOrder(id: string): Promise<ConsentOrderSnapshot | null>;
    openRequest(id: string, requestedBy: string): Promise<void>;
    decide(id: string, status: ConsentStatus, reason: string): Promise<void>;
}

/** Statuses in which a cancellation may be requested at all. */
const REQUESTABLE = ['PENDING', 'PENDING_SELLER_VERIFICATION', 'SELLER_VERIFIED', 'CONFIRMED'];

export class OrderCancellationConsentUseCase {
    constructor(private readonly store: CancellationConsentStore) { }

    /** Step 1 — either participant opens a cancellation request. */
    async request(params: {
        orderId: string;
        actorUserId: string;
    }): Promise<{
        outcome: 'opened' | 'already-requested' | 'already-cancelled' | 'forbidden' | 'not-found' | 'invalid-state';
        order?: ConsentOrderSnapshot;
        message?: string;
    }> {
        const order = await this.store.findOrder(params.orderId);
        if (!order) return { outcome: 'not-found' };

        if (params.actorUserId !== order.buyerId && params.actorUserId !== order.sellerId) {
            return { outcome: 'forbidden', message: 'Only the buyer or seller can act on this order' };
        }

        const status = String(order.status).toUpperCase();
        if (status === 'CANCELLED') return { outcome: 'already-cancelled', order };

        if (!REQUESTABLE.includes(status)) {
            return { outcome: 'invalid-state', order, message: `Cancellation cannot be requested in status ${status}` };
        }

        // Idempotent: a retrying buyer must not reset a request the seller has
        // not yet answered.
        if (order.cancelRequestStatus === 'PENDING_SELLER') {
            return { outcome: 'already-requested', order };
        }

        await this.store.openRequest(params.orderId, params.actorUserId);
        return {
            outcome: 'opened',
            order,
            message: status === 'CONFIRMED'
                ? 'Cancellation requested. The seller must approve before the order can be cancelled and the payment refunded.'
                : 'Cancellation requested.',
        };
    }

    /** Step 2a — the seller approves. */
    async approve(params: {
        orderId: string;
        actorUserId: string;
        reason?: string;
    }): Promise<
        | { outcome: 'approved' | 'forbidden' | 'not-found' | 'no-request'; order?: ConsentOrderSnapshot; reason: string }
    > {
        return this.decide({ ...params, status: 'APPROVED' });
    }

    /** Step 2b — the seller declines. The order is left completely untouched. */
    async decline(params: {
        orderId: string;
        actorUserId: string;
        reason?: string;
    }): Promise<
        | { outcome: 'declined' | 'forbidden' | 'not-found' | 'no-request'; order?: ConsentOrderSnapshot; reason: string }
    > {
        return this.decide({ ...params, status: 'DECLINED' });
    }

    private async decide(params: {
        orderId: string;
        actorUserId: string;
        reason?: string;
        status: ConsentStatus;
    }): Promise<any> {
        const order = await this.store.findOrder(params.orderId);
        if (!order) return { outcome: 'not-found', reason: 'Order not found' };

        if (params.actorUserId !== order.sellerId) {
            return { outcome: 'forbidden', order, reason: 'Only the seller can decide a cancellation request' };
        }

        if (order.cancelRequestStatus !== 'PENDING_SELLER') {
            return {
                outcome: 'no-request',
                order,
                reason: `No pending cancellation request (status: ${order.cancelRequestStatus ?? 'none'})`,
            };
        }

        const reason = String(
            params.reason ??
            (params.status === 'APPROVED'
                ? 'Seller approved cancellation request'
                : 'Seller declined cancellation request')
        );

        await this.store.decide(params.orderId, params.status, reason);
        return {
            outcome: params.status === 'APPROVED' ? 'approved' : 'declined',
            order,
            reason,
        };
    }
}
