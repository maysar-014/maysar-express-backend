/**
 * Payment Limits Policy
 * Configurable policy for payment transaction limits
 * Enforces daily limits, transaction limits, and method-specific constraints
 */

export interface PaymentLimits {
    dailyLimit: number;
    transactionLimit: number;
    monthlyLimit: number;
    perMethodLimits: Record<string, MethodLimits>;
}

export interface MethodLimits {
    minAmount: number;
    maxAmount: number;
    dailyLimit: number;
    transactionCount: number;
}

export interface LimitCheckResult {
    isWithinLimits: boolean;
    violations: string[];
    remainingDaily: number;
    remainingMonthly: number;
}

export class PaymentLimitsPolicy {
    private readonly DEFAULT_DAILY_LIMIT = 10000000; // TZS 10M
    private readonly DEFAULT_TRANSACTION_LIMIT = 5000000; // TZS 5M
    private readonly DEFAULT_MONTHLY_LIMIT = 50000000; // TZS 50M

    private limits: PaymentLimits;

    constructor(customLimits?: Partial<PaymentLimits>) {
        this.limits = {
            dailyLimit: customLimits?.dailyLimit || this.DEFAULT_DAILY_LIMIT,
            transactionLimit: customLimits?.transactionLimit || this.DEFAULT_TRANSACTION_LIMIT,
            monthlyLimit: customLimits?.monthlyLimit || this.DEFAULT_MONTHLY_LIMIT,
            perMethodLimits: customLimits?.perMethodLimits || this.getDefaultMethodLimits(),
        };
    }

    /**
     * Check if transaction is within all limits
     */
    isWithinLimits(
        amount: number,
        paymentMethod: string,
        dailyTotal: number,
        monthlyTotal: number,
        dailyTransactionCount: number
    ): LimitCheckResult {
        const violations: string[] = [];

        // Check transaction limit
        if (amount > this.limits.transactionLimit) {
            violations.push(
                `Transaction amount ${amount} exceeds limit ${this.limits.transactionLimit}`
            );
        }

        // Check daily limit
        const newDailyTotal = dailyTotal + amount;
        if (newDailyTotal > this.limits.dailyLimit) {
            violations.push(
                `Daily limit exceeded. Current: ${dailyTotal}, Limit: ${this.limits.dailyLimit}`
            );
        }

        // Check monthly limit
        const newMonthlyTotal = monthlyTotal + amount;
        if (newMonthlyTotal > this.limits.monthlyLimit) {
            violations.push(
                `Monthly limit exceeded. Current: ${monthlyTotal}, Limit: ${this.limits.monthlyLimit}`
            );
        }

        // Check method-specific limits
        const methodLimits = this.getMethodLimits(paymentMethod);
        if (methodLimits) {
            if (amount < methodLimits.minAmount) {
                violations.push(
                    `Amount ${amount} below minimum ${methodLimits.minAmount} for ${paymentMethod}`
                );
            }

            if (amount > methodLimits.maxAmount) {
                violations.push(
                    `Amount ${amount} exceeds maximum ${methodLimits.maxAmount} for ${paymentMethod}`
                );
            }

            if (newDailyTotal > methodLimits.dailyLimit) {
                violations.push(
                    `Daily limit for ${paymentMethod} exceeded. Limit: ${methodLimits.dailyLimit}`
                );
            }

            if (dailyTransactionCount >= methodLimits.transactionCount) {
                violations.push(
                    `Transaction count limit for ${paymentMethod} exceeded. Limit: ${methodLimits.transactionCount}`
                );
            }
        }

        return {
            isWithinLimits: violations.length === 0,
            violations,
            remainingDaily: Math.max(0, this.limits.dailyLimit - newDailyTotal),
            remainingMonthly: Math.max(0, this.limits.monthlyLimit - newMonthlyTotal),
        };
    }

    /**
     * Check daily limit
     */
    checkDailyLimit(currentDailyTotal: number, transactionAmount: number): boolean {
        return currentDailyTotal + transactionAmount <= this.limits.dailyLimit;
    }

    /**
     * Check transaction limit
     */
    checkTransactionLimit(amount: number): boolean {
        return amount <= this.limits.transactionLimit;
    }

    /**
     * Check monthly limit
     */
    checkMonthlyLimit(currentMonthlyTotal: number, transactionAmount: number): boolean {
        return currentMonthlyTotal + transactionAmount <= this.limits.monthlyLimit;
    }

    /**
     * Get method-specific limits
     */
    getMethodLimits(paymentMethod: string): MethodLimits | undefined {
        return this.limits.perMethodLimits[paymentMethod.toUpperCase()];
    }

    /**
     * Get default method limits
     */
    private getDefaultMethodLimits(): Record<string, MethodLimits> {
        return {
            MPESA: {
                minAmount: 500,
                maxAmount: 5000000,
                dailyLimit: 10000000,
                transactionCount: 50,
            },
            AIRTEL_MONEY: {
                minAmount: 500,
                maxAmount: 5000000,
                dailyLimit: 10000000,
                transactionCount: 50,
            },
            TIGO_PESA: {
                minAmount: 500,
                maxAmount: 5000000,
                dailyLimit: 10000000,
                transactionCount: 50,
            },
            HALOPESA: {
                minAmount: 500,
                maxAmount: 5000000,
                dailyLimit: 10000000,
                transactionCount: 50,
            },
            WALLET: {
                minAmount: 100,
                maxAmount: 10000000,
                dailyLimit: 20000000,
                transactionCount: 100,
            },
            BANK_TRANSFER: {
                minAmount: 1000,
                maxAmount: 50000000,
                dailyLimit: 50000000,
                transactionCount: 20,
            },
            CARD: {
                minAmount: 1000,
                maxAmount: 20000000,
                dailyLimit: 20000000,
                transactionCount: 30,
            },
        };
    }

    /**
     * Update limits (for admin configuration)
     */
    updateLimits(newLimits: Partial<PaymentLimits>): void {
        this.limits = {
            ...this.limits,
            ...newLimits,
        };
    }

    /**
     * Get current limits
     */
    getLimits(): PaymentLimits {
        return { ...this.limits };
    }
}
