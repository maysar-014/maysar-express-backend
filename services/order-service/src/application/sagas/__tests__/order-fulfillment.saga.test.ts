import { OrderFulfillmentSaga } from '../order-fulfillment.saga';

class TestableOrderFulfillmentSaga extends OrderFulfillmentSaga {
    public async testPublishCommand(command: string, payload: Record<string, unknown>, correlationId: string) {
        return this.publishCommand(command, payload, correlationId);
    }
    public publishCommand = jest.fn();
}

describe('OrderFulfillmentSaga', () => {
    let saga: TestableOrderFulfillmentSaga;

    beforeEach(() => {
        saga = new TestableOrderFulfillmentSaga();
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
        it('should publish StockReservation.Command', async () => {
            const steps = (saga as unknown as { defineSteps: () => Array<{ name: string; execute: (p: unknown, c: string) => Promise<void> }> }).defineSteps();
            const step = steps.find((s) => s.name === 'StockReservation');

            if (step) await step.execute(payload, 'saga-1');

            expect(saga.publishCommand).toHaveBeenCalledWith(
                'StockReservation.Command',
                expect.objectContaining({
                    orderId: 'o1',
                    items: payload.items
                }),
                'saga-1'
            );
        });

        it('should compensate with StockRelease.Command', async () => {
            const steps = (saga as unknown as { defineSteps: () => Array<{ name: string; compensate: (p: unknown, c: string) => Promise<void> }> }).defineSteps();
            const step = steps.find((s) => s.name === 'StockReservation');

            if (step) await step.compensate(payload, 'saga-1');

            expect(saga.publishCommand).toHaveBeenCalledWith(
                'StockRelease.Command',
                expect.objectContaining({ orderId: 'o1' }),
                'saga-1'
            );
        });
    });

    describe('Payment Step', () => {
        it('should publish Payment.Command', async () => {
            const steps = (saga as unknown as { defineSteps: () => Array<{ name: string; execute: (p: unknown, c: string) => Promise<void> }> }).defineSteps();
            const step = steps.find((s) => s.name === 'Payment');

            if (step) await step.execute(payload, 'saga-1');

            expect(saga.publishCommand).toHaveBeenCalledWith(
                'Payment.Command',
                expect.objectContaining({
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
            saga.completeStep = jest.fn();

            await saga.handleStockReserved('saga-1');

            expect(saga.completeStep).toHaveBeenCalledWith('saga-1', 'StockReservation');
        });
    });
});
