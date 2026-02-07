import { Money } from '../value-objects/money.value-object';

export interface LimitConfig {
    dailyTransactionCount: number;
    dailyTransactionAmount: number; // Minor units
    monthlyTransactionAmount: number; // Minor units
    singleTransactionMax: number; // Minor units
    minimumBalance: number; // Minor units
    maxFrozenRatio: number; // 0.0 to 1.0
}

export interface LimitCheckResult {
    allowed: boolean;
    reason?: string;
}

export class LimitPolicy {
    constructor(private readonly config: LimitConfig) { }

    public canDebit(
        amount: Money,
        currentBalance: Money,
        frozenAmount: Money,
        dailyCount: number,
        dailyTotal: Money,
        monthlyTotal: Money
    ): LimitCheckResult {
        // 1. Single Transaction Max
        if (amount.amount > this.config.singleTransactionMax) {
            return { allowed: false, reason: 'EXCEEDS_SINGLE_TRANSACTION_LIMIT' };
        }

        // 2. Minimum Balance
        const projectedBalance = currentBalance.amount - amount.amount;
        if (projectedBalance < this.config.minimumBalance) {
            return { allowed: false, reason: 'INSUFFICIENT_FUNDS_MIN_BALANCE' };
        }

        // 3. Max Frozen Ratio (Check if this debit increases frozen or if we are validating a freeze)
        // Usually checked during freeze, but let's assume this is generic debit check.

        // 4. Daily Limits
        if (dailyCount >= this.config.dailyTransactionCount) {
            return { allowed: false, reason: 'EXCEEDS_DAILY_COUNT_LIMIT' };
        }
        if (dailyTotal.amount + amount.amount > this.config.dailyTransactionAmount) {
            return { allowed: false, reason: 'EXCEEDS_DAILY_AMOUNT_LIMIT' };
        }

        // 5. Monthly Limits
        if (monthlyTotal.amount + amount.amount > this.config.monthlyTransactionAmount) {
            return { allowed: false, reason: 'EXCEEDS_MONTHLY_AMOUNT_LIMIT' };
        }

        return { allowed: true };
    }

    public canFreeze(
        amount: Money,
        currentBalance: Money,
        currentFrozen: Money
    ): LimitCheckResult {
        const newFrozen = currentFrozen.amount + amount.amount;
        const ratio = newFrozen / currentBalance.amount;

        if (ratio > this.config.maxFrozenRatio) {
            return { allowed: false, reason: 'EXCEEDS_MAX_FROZEN_RATIO' };
        }

        return { allowed: true };
    }
}
