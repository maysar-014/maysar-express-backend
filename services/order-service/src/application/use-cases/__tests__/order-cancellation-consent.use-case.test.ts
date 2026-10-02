import { OrderCancellationConsentUseCase } from '../order-cancellation-consent.use-case';

/**
 * The consent workflow governs who bears the loss on a paid order, so the
 * authorization and state-machine rules are asserted explicitly rather than
 * inferred from the controller.
 */
describe('OrderCancellationConsentUseCase', () => {
    const BUYER = 'buyer-1';
    const SELLER = 'seller-1';
    const STRANGER = 'user-x';

    const makeStore = (order: any) => {
        const state = { ...order };
        const store = {
            openRequest: jest.fn(async (id: string, by: string) => {
                state.cancelRequestStatus = 'PENDING_SELLER';
                state.cancelRequestedBy = by;
            }),
            decide: jest.fn(async (id: string, status: string, reason: string) => {
                state.cancelRequestStatus = status;
                state.cancelDecisionReason = reason;
            }),
        };
        const useCase = new OrderCancellationConsentUseCase({
            findOrder: jest.fn(async () => ({ ...state })),
            ...store,
        });
        return { useCase, store, state };
    };

    it('lets the buyer open a request on a paid order', async () => {
        const { useCase, store, state } = makeStore({
            id: 'ORD-1', buyerId: BUYER, sellerId: SELLER,
            status: 'CONFIRMED', cancelRequestStatus: null,
        });

        const result = await useCase.request({ orderId: 'ORD-1', actorUserId: BUYER });

        expect(result.outcome).toBe('opened');
        expect(store.openRequest).toHaveBeenCalledWith('ORD-1', BUYER);
        expect(state.cancelRequestStatus).toBe('PENDING_SELLER');
        // A paid order must be told the seller has to agree first.
        expect(result.message).toMatch(/seller must approve/i);
    });

    it('does not let a stranger open or decide a request', async () => {
        const { useCase, store } = makeStore({
            id: 'ORD-1', buyerId: BUYER, sellerId: SELLER,
            status: 'CONFIRMED', cancelRequestStatus: null,
        });

        expect((await useCase.request({ orderId: 'ORD-1', actorUserId: STRANGER })).outcome).toBe('forbidden');
        expect(store.openRequest).not.toHaveBeenCalled();

        const pending = makeStore({
            id: 'ORD-1', buyerId: BUYER, sellerId: SELLER,
            status: 'CONFIRMED', cancelRequestStatus: 'PENDING_SELLER',
        });
        // Critical: the buyer must never be able to approve their own request.
        expect((await pending.useCase.approve({ orderId: 'ORD-1', actorUserId: BUYER })).outcome).toBe('forbidden');
        expect(pending.store.decide).not.toHaveBeenCalled();
    });

    it('is idempotent so a retrying buyer does not reset an open request', async () => {
        const { useCase, store } = makeStore({
            id: 'ORD-1', buyerId: BUYER, sellerId: SELLER,
            status: 'CONFIRMED', cancelRequestStatus: 'PENDING_SELLER',
        });

        const result = await useCase.request({ orderId: 'ORD-1', actorUserId: BUYER });

        expect(result.outcome).toBe('already-requested');
        expect(store.openRequest).not.toHaveBeenCalled();
    });

    it('records the seller decision with a reason', async () => {
        const forApprove = makeStore({
            id: 'ORD-1', buyerId: BUYER, sellerId: SELLER,
            status: 'CONFIRMED', cancelRequestStatus: 'PENDING_SELLER',
        });
        const approved = await forApprove.useCase.approve({ orderId: 'ORD-1', actorUserId: SELLER, reason: 'ok' });
        expect(approved.outcome).toBe('approved');
        expect(forApprove.store.decide).toHaveBeenCalledWith('ORD-1', 'APPROVED', 'ok');

        const forDecline = makeStore({
            id: 'ORD-1', buyerId: BUYER, sellerId: SELLER,
            status: 'CONFIRMED', cancelRequestStatus: 'PENDING_SELLER',
        });
        const declined = await forDecline.useCase.decline({ orderId: 'ORD-1', actorUserId: SELLER, reason: 'no' });
        expect(declined.outcome).toBe('declined');
        expect(forDecline.store.decide).toHaveBeenCalledWith('ORD-1', 'DECLINED', 'no');
    });

    it('refuses a decision when nothing is pending', async () => {
        const { useCase, store } = makeStore({
            id: 'ORD-1', buyerId: BUYER, sellerId: SELLER,
            status: 'CONFIRMED', cancelRequestStatus: null,
        });

        expect((await useCase.approve({ orderId: 'ORD-1', actorUserId: SELLER })).outcome).toBe('no-request');
        expect(store.decide).not.toHaveBeenCalled();
    });

    it('rejects a request on an order that can no longer be cancelled', async () => {
        const { useCase } = makeStore({
            id: 'ORD-1', buyerId: BUYER, sellerId: SELLER,
            status: 'IN_TRANSIT', cancelRequestStatus: null,
        });

        expect((await useCase.request({ orderId: 'ORD-1', actorUserId: BUYER })).outcome).toBe('invalid-state');
    });

    it('treats an already-cancelled order as done rather than an error', async () => {
        const { useCase } = makeStore({
            id: 'ORD-1', buyerId: BUYER, sellerId: SELLER,
            status: 'CANCELLED', cancelRequestStatus: 'APPROVED',
        });

        expect((await useCase.request({ orderId: 'ORD-1', actorUserId: BUYER })).outcome).toBe('already-cancelled');
    });
});
