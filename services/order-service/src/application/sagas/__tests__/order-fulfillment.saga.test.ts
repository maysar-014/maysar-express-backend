import { OrderFulfillmentSaga } from '../order-fulfillment.saga';
import { EventIdempotency } from '@shared/middleware/idempotency';

const mockEventIdempotency = {
    isProcessed: jest.fn().mockResolvedValue(false),
    markProcessed: jest.fn().mockResolvedValue(undefined),
    withIdempotency: jest.fn().mockImplementation(
        (_eventId: string, _consumer: string, handler: () => Promise<any>) => handler()
    ),
} as unknown as EventIdempotency;

class TestableOrderFulfillmentSaga extends OrderFulfillmentSaga {
    public async testPublishCommand(command: string, payload: Record<string, unknown>, correlationId: string) {
        return this.publishCommand(command, payload, correlationId);
    }
    public publishCommand = jest.fn();
}

describe('OrderFulfillmentSaga', () => {
    let saga: TestableOrderFulfillmentSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new TestableOrderFulfillmentSaga(mockEventIdempotency);
    });

    const payload = {
        orderId: 'o1',
        buyerId: 'b1',
        sellerId: 's1',
        amount: 100,
        items: [{ productId: 'p1', quantity: 1 }]
    };

    it('should define correct steps', () => {
        const steps = (saga as unknown as { defineSteps: () => Array<{ name: string }> }).defineSteps();

        expect(steps).toBeDefined();
        expect(steps.length).toBe(3);
        expect(steps[0].name).toBe('StockReservation');
        expect(steps[1].name).toBe('Payment');
        expect(steps[2].name).toBe('Delivery');
    });

    describe('StockReservation Step', () => {
        it('should publish StockReservation.Command.v1', async () => {
            const steps = (saga as unknown as { defineSteps: () => Array<{ name: string; execute: (p: unknown, c: string) => Promise<void> }> }).defineSteps();
            const step = steps.find((s) => s.name === 'StockReservation');

            if (step) await step.execute(payload, 'saga-1');

            expect(saga.publishCommand).toHaveBeenCalledWith(
                'StockReservation.Command.v1',
                expect.objectContaining({
                    sagaId: 'saga-1',
                    orderId: 'o1',
                    items: payload.items
                }),
                'saga-1'
            );
        });

        it('should compensate with StockRelease.Command.v1', async () => {
            const steps = (saga as unknown as { defineSteps: () => Array<{ name: string; compensate: (p: unknown, c: string) => Promise<void> }> }).defineSteps();
            const step = steps.find((s) => s.name === 'StockReservation');

            if (step) await step.compensate(payload, 'saga-1');

            expect(saga.publishCommand).toHaveBeenCalledWith(
                'StockRelease.Command.v1',
                expect.objectContaining({
                    sagaId: 'saga-1',
                    orderId: 'o1'
                }),
                'saga-1'
            );
        });
    });

    describe('Payment Step', () => {
        it('should publish Payment.Command.v1', async () => {
            const steps = (saga as unknown as { defineSteps: () => Array<{ name: string; execute: (p: unknown, c: string) => Promise<void> }> }).defineSteps();
            const step = steps.find((s) => s.name === 'Payment');

            if (step) await step.execute(payload, 'saga-1');

            expect(saga.publishCommand).toHaveBeenCalledWith(
                'Payment.Command.v1',
                expect.objectContaining({
                    sagaId: 'saga-1',
                    orderId: 'o1',
                    amount: 100,
                    buyerId: 'b1'
                }),
                'saga-1'
            );
        });
    });

    describe('Event Handlers', () => {
        it('should complete StockReservation step on success', async () => {
            const completeStep = jest.fn();
            (saga as unknown as { completeStep: jest.Mock }).completeStep = completeStep;

            await saga.handleStockReserved('saga-1');

            expect(mockEventIdempotency.withIdempotency).toHaveBeenCalledWith(
                'saga-1',
                'OrderFulfillmentSaga.StockReserved',
                expect.any(Function)
            );
            expect(completeStep).toHaveBeenCalledWith('saga-1', 'StockReservation');
        });

        it('should skip handler when event already processed', async () => {
            const completeStep = jest.fn();
            (saga as unknown as { completeStep: jest.Mock }).completeStep = completeStep;
            (mockEventIdempotency.withIdempotency as jest.Mock).mockResolvedValueOnce(null);

            const result = await saga.handleStockReserved('saga-1');

            expect(result).toBeUndefined();
            expect(completeStep).not.toHaveBeenCalled();
        });
    });
});
