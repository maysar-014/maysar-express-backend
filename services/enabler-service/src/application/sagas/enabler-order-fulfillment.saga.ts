import { FacilitateOrderUseCase } from '../use-cases/facilitate-order.use-case';

export class EnablerOrderFulfillmentSaga {
    constructor(
        private readonly facilitateOrderUseCase: FacilitateOrderUseCase,
        private readonly inventoryService: any,
        private readonly paymentService: any,
        private readonly notificationService: any
    ) { }

    async execute(orderData: any): Promise<void> {
        let orderId: string | null = null;

        try {
            // 1. Facilitate Order (Includes Inventory Check & Reserve)
            const order = await this.facilitateOrderUseCase.execute(orderData);
            orderId = order.id;

            // 2. Process Payment (Buyer -> Platform)
            const paymentResult = await this.paymentService.processPayment({
                orderId: order.orderId,
                amount: order.orderAmount,
                payerId: orderData.buyerId
                // ... payment method details
            });

            if (!paymentResult.success) {
                throw new Error('Payment failed');
            }

            // 3. Confirm Inventory
            await this.inventoryService.confirmReservation(orderData.listingId, orderData.quantity);

            // 4. Confirm Order (Update status to CONFIRMED)
            // await this.orderRepository.updateStatus(order.id, 'CONFIRMED');

            // 5. Notify Parties
            await this.notificationService.sendOrderConfirmation(orderData.buyerId, order.orderId);
            await this.notificationService.sendNewOrderNotification(order.enablerId, order.orderId);

        } catch (error: any) {
            console.error('Order Fulfillment Saga Failed:', error);
            await this.compensate(orderId, orderData, error.message);
            throw error;
        }
    }

    private async compensate(orderId: string | null, orderData: any, reason: string): Promise<void> {
        if (orderId) {
            // Cancel Order
            // await this.orderRepository.updateStatus(orderId, 'CANCELLED');
        }

        // Release Inventory
        await this.inventoryService.releaseReservation(orderData.listingId, orderData.quantity);

        // Refund Payment if it was processed?
        // Usually handled by payment service idempotency
    }
}
