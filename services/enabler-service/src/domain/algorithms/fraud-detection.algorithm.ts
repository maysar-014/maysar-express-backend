export interface OrderActivity {
    enablerId: string;
    buyerId: string;
    orderAmount: number;
    timestamp: Date;
    ipAddress?: string;
}

export class FraudDetectionAlgorithm {

    static detectFraud(activity: OrderActivity, history: OrderActivity[]): { isFraudulent: boolean; reason?: string; riskScore: number } {
        let riskScore = 0;
        const reasons: string[] = [];

        // Check for high velocity orders
        const recentOrders = history.filter(h =>
            h.enablerId === activity.enablerId &&
            (activity.timestamp.getTime() - h.timestamp.getTime()) < 3600000 // 1 hour
        );

        if (recentOrders.length > 10) {
            riskScore += 50;
            reasons.push('High order velocity');
        }

        // Check for large order amount
        if (activity.orderAmount > 5000000) { // 5M TZS
            riskScore += 30;
            reasons.push('High value order');
        }

        // Check for self-dealing (IP match)
        const ipMatches = history.filter(h => h.ipAddress === activity.ipAddress && h.enablerId !== activity.enablerId);
        if (ipMatches.length > 0) {
            riskScore += 20;
            reasons.push('Suspicious IP activity');
        }

        return {
            isFraudulent: riskScore >= 80,
            reason: reasons.length > 0 ? reasons.join(', ') : undefined,
            riskScore
        };
    }
}
