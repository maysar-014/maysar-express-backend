export interface CommissionContext {
    orderStatus: string;
    isDisputed: boolean;
    daysSinceDelivery?: number;
    fraudScore?: number;
}

export class CommissionProtectionPolicy {
    private static readonly RETURN_WINDOW_DAYS = 14;
    private static readonly FRAUD_THRESHOLD = 80;

    static isCommissionProtected(context: CommissionContext): { protected: boolean; reason?: string } {
        if (context.isDisputed) {
            return { protected: false, reason: 'Order is disputed' };
        }

        if (context.fraudScore && context.fraudScore > this.FRAUD_THRESHOLD) {
            return { protected: false, reason: 'High fraud risk detected' };
        }

        if (context.orderStatus !== 'COMPLETED' && context.orderStatus !== 'DELIVERED') {
            return { protected: false, reason: 'Order not completed' };
        }

        return { protected: true };
    }

    static canReleasePayout(context: CommissionContext): boolean {
        if (!context.daysSinceDelivery) return false;

        const protectionCheck = this.isCommissionProtected(context);
        if (!protectionCheck.protected) return false;

        // Release only after return window closes
        return context.daysSinceDelivery >= this.RETURN_WINDOW_DAYS;
    }
}
