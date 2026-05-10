export enum CODAction {
    ORDER_PLACED = 'ORDER_PLACED',
    DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
    DELIVERY_REFUSED = 'DELIVERY_REFUSED',
    FRAUD_DETECTED = 'FRAUD_DETECTED',
    PENALTY_APPLIED = 'PENALTY_APPLIED'
}

export interface ReputationUpdate {
    newScore: number;
    change: number;
    suspendedUntil?: Date;
    permanentlyDisabled: boolean;
    reason?: string;
}

export class CODReputationEngine {
    private readonly MAX_SCORE = 100;
    private readonly MIN_SCORE = 0;
    private readonly INITIAL_UNLOCK_BONUS = 20;
    private readonly SUCCESS_BONUS = 5;
    private readonly REFUSAL_PENALTY = -10;
    private readonly FRAUD_PENALTY = -20;
    private readonly MIN_ELIGIBILITY_SCORE = 50;
    private readonly MIN_SUCCESSFUL_ORDERS = 3;
    private readonly SUSPENSION_THRESHOLD = 30;
    private readonly BAN_THRESHOLD = 10;
    private readonly SUSPENSION_DAYS = 30;

    /**
     * Calculates the new reputation score and determines if any penalties should be applied.
     */
    calculateNewScore(currentScore: number, action: CODAction, isFirstSuccess: boolean = false): ReputationUpdate {
        let change = 0;
        let reason = '';

        switch (action) {
            case CODAction.DELIVERY_CONFIRMED:
                change = this.SUCCESS_BONUS;
                reason = 'Successful COD delivery confirmation';
                if (isFirstSuccess) {
                    change += this.INITIAL_UNLOCK_BONUS;
                    reason = 'First successful COD order - unlock bonus applied';
                }
                break;
            case CODAction.DELIVERY_REFUSED:
                change = this.REFUSAL_PENALTY;
                reason = 'Delivery refused by buyer';
                break;
            case CODAction.FRAUD_DETECTED:
                change = this.FRAUD_PENALTY;
                reason = 'Fraudulent activity detected in COD transaction';
                break;
            case CODAction.PENALTY_APPLIED:
                change = -10; // Generic penalty
                reason = 'Manual penalty applied';
                break;
            default:
                change = 0;
                reason = 'Action recorded';
        }

        const newScore = Math.min(this.MAX_SCORE, Math.max(this.MIN_SCORE, currentScore + change));

        let suspendedUntil: Date | undefined;
        let permanentlyDisabled = false;

        if (newScore < this.BAN_THRESHOLD) {
            permanentlyDisabled = true;
            reason += ' - Account permanently disabled for COD due to low reputation';
        } else if (newScore < this.SUSPENSION_THRESHOLD) {
            const suspensionDate = new Date();
            suspensionDate.setDate(suspensionDate.getDate() + this.SUSPENSION_DAYS);
            suspendedUntil = suspensionDate;
            reason += ` - COD access suspended for ${this.SUSPENSION_DAYS} days due to low reputation`;
        }

        return {
            newScore,
            change,
            suspendedUntil,
            permanentlyDisabled,
            reason
        };
    }

    /**
     * Determines if a user is eligible for COD based on their current status.
     */
    isEligible(
        score: number,
        successfulOrders: number,
        suspendedUntil?: Date,
        permanentlyDisabled: boolean = false
    ): { eligible: boolean; reason?: string } {
        if (permanentlyDisabled) {
            return { eligible: false, reason: 'COD is permanently disabled for this account' };
        }

        if (suspendedUntil && suspendedUntil > new Date()) {
            return { eligible: false, reason: `COD access is suspended until ${suspendedUntil.toISOString()}` };
        }

        if (score < this.MIN_ELIGIBILITY_SCORE) {
            return {
                eligible: false,
                reason: `COD reputation score (${score}) is below required minimum of ${this.MIN_ELIGIBILITY_SCORE}`
            };
        }

        if (successfulOrders < this.MIN_SUCCESSFUL_ORDERS) {
            return {
                eligible: false,
                reason: `Buyer must have at least ${this.MIN_SUCCESSFUL_ORDERS} successful orders to unlock COD privilege`
            };
        }

        return { eligible: true };
    }
}
