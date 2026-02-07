
export class LogisticsServiceAdapter {
    async triggerFulfillment(orderId: string): Promise<void> {
        console.log(`[LogisticsAdapter] Triggering fulfillment for order ${orderId}`);
    }
}
