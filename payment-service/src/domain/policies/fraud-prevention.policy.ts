/**
 * Fraud Prevention Policy
 * Business rules for fraud prevention and risk management
 * Defines risk thresholds, auto-decline rules, and manual review triggers
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FraudAction = 'approve' | 'review' | 'decline' | 'block';

export interface FraudActionDecision {
    action: FraudAction;
    reason: string;
    requiresManualReview: boolean;
    autoDecline: boolean;
    blockUser: boolean;
}

export class FraudPreventionPolicy {
    private readonly LOW_RISK_THRESHOLD = 30;
    private readonly MEDIUM_RISK_THRESHOLD = 60;
    private readonly HIGH_RISK_THRESHOLD = 80;
    private readonly CRITICAL_RISK_THRESHOLD = 90;

    private readonly AUTO_DECLINE_THRESHOLD = 85;
    private readonly MANUAL_REVIEW_THRESHOLD = 60;
    private readonly BLOCK_USER_THRESHOLD = 95;

    /**
     * Determine action based on risk level and score
     */
    getActionForRiskLevel(riskLevel: RiskLevel, riskScore: number): FraudActionDecision {
        // Auto-block for critical risk
        if (riskScore >= this.BLOCK_USER_THRESHOLD) {
            return {
                action: 'block',
                reason: `Critical fraud risk detected (score: ${riskScore})`,
                requiresManualReview: true,
                autoDecline: true,
                blockUser: true,
            };
        }

        // Auto-decline for high risk
        if (riskScore >= this.AUTO_DECLINE_THRESHOLD) {
            return {
                action: 'decline',
                reason: `High fraud risk detected (score: ${riskScore})`,
                requiresManualReview: true,
                autoDecline: true,
                blockUser: false,
            };
        }

        // Manual review for medium-high risk
        if (riskScore >= this.MANUAL_REVIEW_THRESHOLD) {
            return {
                action: 'review',
                reason: `Transaction requires manual review (score: ${riskScore})`,
                requiresManualReview: true,
                autoDecline: false,
                blockUser: false,
            };
        }

        // Approve for low risk
        return {
            action: 'approve',
            reason: `Low fraud risk (score: ${riskScore})`,
            requiresManualReview: false,
            autoDecline: false,
            blockUser: false,
        };
    }

    /**
     * Check if transaction should be auto-declined
     */
    shouldAutoDecline(riskScore: number, riskFlags: string[]): boolean {
        // Auto-decline based on score
        if (riskScore >= this.AUTO_DECLINE_THRESHOLD) {
            return true;
        }

        // Auto-decline based on critical flags
        const criticalFlags = [
            'impossible_travel',
            'stolen_card',
            'known_fraudster',
            'blacklisted_device',
        ];

        return riskFlags.some((flag) => criticalFlags.includes(flag));
    }

    /**
     * Check if transaction requires manual review
     */
    requiresManualReview(riskScore: number, riskFlags: string[]): boolean {
        // Manual review based on score
        if (riskScore >= this.MANUAL_REVIEW_THRESHOLD) {
            return true;
        }

        // Manual review based on specific flags
        const reviewFlags = [
            'high_amount',
            'new_device',
            'unusual_location',
            'high_velocity',
            'suspicious_pattern',
        ];

        return riskFlags.some((flag) => reviewFlags.includes(flag));
    }

    /**
     * Check if user should be blocked
     */
    shouldBlockUser(riskScore: number, fraudAttempts: number): boolean {
        // Block based on risk score
        if (riskScore >= this.BLOCK_USER_THRESHOLD) {
            return true;
        }

        // Block based on repeated fraud attempts
        if (fraudAttempts >= 3) {
            return true;
        }

        return false;
    }

    /**
     * Get risk level from score
     */
    getRiskLevel(riskScore: number): RiskLevel {
        if (riskScore >= this.HIGH_RISK_THRESHOLD) {
            return 'critical';
        }
        if (riskScore >= this.MEDIUM_RISK_THRESHOLD) {
            return 'high';
        }
        if (riskScore >= this.LOW_RISK_THRESHOLD) {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Calculate cooling-off period for suspicious users (in hours)
     */
    getCoolingOffPeriod(riskScore: number): number {
        if (riskScore >= this.CRITICAL_RISK_THRESHOLD) {
            return 72; // 3 days
        }
        if (riskScore >= this.HIGH_RISK_THRESHOLD) {
            return 48; // 2 days
        }
        if (riskScore >= this.MEDIUM_RISK_THRESHOLD) {
            return 24; // 1 day
        }
        return 0; // No cooling-off
    }

    /**
     * Get additional verification requirements
     */
    getVerificationRequirements(riskScore: number): string[] {
        const requirements: string[] = [];

        if (riskScore >= this.MEDIUM_RISK_THRESHOLD) {
            requirements.push('phone_verification');
        }

        if (riskScore >= this.HIGH_RISK_THRESHOLD) {
            requirements.push('email_verification');
            requirements.push('identity_verification');
        }

        if (riskScore >= this.CRITICAL_RISK_THRESHOLD) {
            requirements.push('document_upload');
            requirements.push('video_verification');
        }

        return requirements;
    }

    /**
     * Check if transaction amount is suspicious
     */
    isSuspiciousAmount(amount: number, averageAmount: number): boolean {
        // Amount is 10x higher than average
        if (amount > averageAmount * 10) {
            return true;
        }

        // Round amounts above threshold (common in fraud)
        if (amount % 1000 === 0 && amount > 10000) {
            return true;
        }

        return false;
    }

    /**
     * Check if velocity is suspicious
     */
    isSuspiciousVelocity(
        transactionCount: number,
        timeWindowMinutes: number
    ): boolean {
        const transactionsPerHour = (transactionCount / timeWindowMinutes) * 60;

        // More than 10 transactions per hour
        if (transactionsPerHour > 10) {
            return true;
        }

        // More than 5 transactions in 5 minutes
        if (timeWindowMinutes <= 5 && transactionCount > 5) {
            return true;
        }

        return false;
    }

    /**
     * Get thresholds for configuration
     */
    getThresholds(): {
        lowRisk: number;
        mediumRisk: number;
        highRisk: number;
        criticalRisk: number;
        autoDecline: number;
        manualReview: number;
        blockUser: number;
    } {
        return {
            lowRisk: this.LOW_RISK_THRESHOLD,
            mediumRisk: this.MEDIUM_RISK_THRESHOLD,
            highRisk: this.HIGH_RISK_THRESHOLD,
            criticalRisk: this.CRITICAL_RISK_THRESHOLD,
            autoDecline: this.AUTO_DECLINE_THRESHOLD,
            manualReview: this.MANUAL_REVIEW_THRESHOLD,
            blockUser: this.BLOCK_USER_THRESHOLD,
        };
    }
}
