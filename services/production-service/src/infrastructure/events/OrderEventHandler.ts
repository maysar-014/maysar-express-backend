
import { ProductionPlanSaga } from '../../application/sagas/ProductionPlanSaga';

export class OrderEventHandler {
    constructor(private readonly saga: ProductionPlanSaga) { }

    async handleOrderConfirmed(event: any): Promise<void> {
        console.log(`[OrderEventHandler] Handling OrderConfirmed:`, event);
        await this.saga.onOrderConfirmed(event);
    }

    async handleOrderCancelled(event: any): Promise<void> {
        console.log(`[OrderEventHandler] Handling OrderCancelled:`, event);
        // Trigger cancellation in saga
    }
}
