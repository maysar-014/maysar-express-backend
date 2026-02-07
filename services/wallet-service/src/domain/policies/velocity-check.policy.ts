import { Transaction } from '../entities/transaction.entity';
import { Money } from '../value-objects/money.value-object';

export enum VelocityRiskLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export enum VelocityDecision {
    ALLOW = 'ALLOW',
    CHALLENGE = 'CHALLENGE', // e.g. require OTP
    BLOCK = 'BLOCK'
}

export interface VelocityResult {
    decision: VelocityDecision;
    riskLevel: VelocityRiskLevel;
    reason?: string;
    riskScore: number;
}

export interface VelocityConfig {
    maxTransactionsPerMinute: number;
    maxTransactionsPerHour: number;
    maxAmountPerHour: number; // Minor units
    suspiciousPatternThreshold: number;
}

export class VelocityCheckPolicy {
    constructor(private readonly config: VelocityConfig) { }

    public checkVelocity(
        recentTransactions: Transaction[], // Should be sorted descending by time
        currentAttemptAmount: Money
    ): VelocityResult {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const txsInLastMinute = recentTransactions.filter(t => t.createdAt >= oneMinuteAgo);
        const txsInLastHour = recentTransactions.filter(t => t.createdAt >= oneHourAgo);

        let riskScore = 0;
        let reasons: string[] = [];

        // 1. Frequency Checks
        if (txsInLastMinute.length >= this.config.maxTransactionsPerMinute) {
            riskScore += 50;
            reasons.push('HIGH_FREQUENCY_MINUTE');
        }

        if (txsInLastHour.length >= this.config.maxTransactionsPerHour) {
            riskScore += 30;
            reasons.push('HIGH_FREQUENCY_HOUR');
        }

        // 2. Amount Velocity
        const amountInLastHour = txsInLastHour.reduce((sum, t) => sum + t.amount, 0);
        if (amountInLastHour + currentAttemptAmount.amount > this.config.maxAmountPerHour) {
            riskScore += 40;
            reasons.push('HIGH_AMOUNT_VELOCITY');
        }

        // 3. Pattern Detection (Simple example: exact same amount repeatedly)
        const sameAmountCount = txsInLastHour.filter(t => t.amount === currentAttemptAmount.amount).length;
        if (sameAmountCount >= this.config.suspiciousPatternThreshold) {
            riskScore += 60;
            reasons.push('SUSPICIOUS_REPETITION');
        }

        // Decision Logic
        let decision = VelocityDecision.ALLOW;
        let riskLevel = VelocityRiskLevel.LOW;

        if (riskScore >= 80) {
            decision = VelocityDecision.BLOCK;
            riskLevel = VelocityRiskLevel.CRITICAL;
        } else if (riskScore >= 50) {
            decision = VelocityDecision.CHALLENGE;
            riskLevel = VelocityRiskLevel.HIGH;
        } else if (riskScore >= 20) {
            riskLevel = VelocityRiskLevel.MEDIUM;
        }

        return {
            decision,
            riskLevel,
            riskScore,
            reason: reasons.join(', ')
        };
    }
}
