/**
 * Wallet Engine
 * Pure business logic for wallet operations
 * No database access, only calculations and validations
 */

export interface WalletBalance {
    total: number;
    available: number;
    frozen: number;
}

export interface TransactionValidation {
    isValid: boolean;
    errors: string[];
    availableBalance: number;
    requiredAmount: number;
}

export interface TransferOptimization {
    canTransfer: boolean;
    suggestedAmount?: number;
    reason?: string;
}

export class WalletEngine {
    /**
     * Calculate available balance
     */
    calculateAvailableBalance(totalBalance: number, frozenAmount: number): number {
        if (totalBalance < 0) {
            throw new Error('Total balance cannot be negative');
        }

        if (frozenAmount < 0) {
            throw new Error('Frozen amount cannot be negative');
        }

        if (frozenAmount > totalBalance) {
            throw new Error('Frozen amount cannot exceed total balance');
        }

        return totalBalance - frozenAmount;
    }

    /**
     * Validate transaction against wallet balance
     */
    validateTransaction(
        totalBalance: number,
        frozenAmount: number,
        transactionAmount: number
    ): TransactionValidation {
        const errors: string[] = [];

        if (transactionAmount <= 0) {
            errors.push('Transaction amount must be positive');
        }

        const availableBalance = this.calculateAvailableBalance(
            totalBalance,
            frozenAmount
        );

        if (transactionAmount > availableBalance) {
            errors.push(
                `Insufficient available balance. Available: ${availableBalance}, Required: ${transactionAmount}`
            );
        }

        return {
            isValid: errors.length === 0,
            errors,
            availableBalance,
            requiredAmount: transactionAmount,
        };
    }

    /**
     * Optimize transfer amount (suggest lower amount if insufficient)
     */
    optimizeTransfer(
        totalBalance: number,
        frozenAmount: number,
        requestedAmount: number
    ): TransferOptimization {
        const availableBalance = this.calculateAvailableBalance(
            totalBalance,
            frozenAmount
        );

        if (requestedAmount <= availableBalance) {
            return {
                canTransfer: true,
            };
        }

        if (availableBalance > 0) {
            return {
                canTransfer: false,
                suggestedAmount: availableBalance,
                reason: `Insufficient balance. Maximum available: ${availableBalance}`,
            };
        }

        return {
            canTransfer: false,
            reason: 'No available balance for transfer',
        };
    }

    /**
     * Calculate new balance after credit
     */
    calculateBalanceAfterCredit(
        currentBalance: number,
        creditAmount: number
    ): number {
        if (creditAmount <= 0) {
            throw new Error('Credit amount must be positive');
        }

        return currentBalance + creditAmount;
    }

    /**
     * Calculate new balance after debit
     */
    calculateBalanceAfterDebit(
        currentBalance: number,
        frozenAmount: number,
        debitAmount: number
    ): number {
        if (debitAmount <= 0) {
            throw new Error('Debit amount must be positive');
        }

        const availableBalance = this.calculateAvailableBalance(
            currentBalance,
            frozenAmount
        );

        if (debitAmount > availableBalance) {
            throw new Error(
                `Insufficient balance. Available: ${availableBalance}, Required: ${debitAmount}`
            );
        }

        return currentBalance - debitAmount;
    }

    /**
     * Calculate new frozen amount after freeze
     */
    calculateFrozenAmountAfterFreeze(
        currentBalance: number,
        currentFrozenAmount: number,
        freezeAmount: number
    ): number {
        if (freezeAmount <= 0) {
            throw new Error('Freeze amount must be positive');
        }

        const availableBalance = this.calculateAvailableBalance(
            currentBalance,
            currentFrozenAmount
        );

        if (freezeAmount > availableBalance) {
            throw new Error(
                `Cannot freeze ${freezeAmount}. Available balance: ${availableBalance}`
            );
        }

        return currentFrozenAmount + freezeAmount;
    }

    /**
     * Calculate new frozen amount after unfreeze
     */
    calculateFrozenAmountAfterUnfreeze(
        currentFrozenAmount: number,
        unfreezeAmount: number
    ): number {
        if (unfreezeAmount <= 0) {
            throw new Error('Unfreeze amount must be positive');
        }

        if (unfreezeAmount > currentFrozenAmount) {
            throw new Error(
                `Cannot unfreeze ${unfreezeAmount}. Frozen amount: ${currentFrozenAmount}`
            );
        }

        return currentFrozenAmount - unfreezeAmount;
    }

    /**
     * Calculate balance and frozen amount after debit frozen
     */
    calculateAfterDebitFrozen(
        currentBalance: number,
        currentFrozenAmount: number,
        debitAmount: number
    ): { newBalance: number; newFrozenAmount: number } {
        if (debitAmount <= 0) {
            throw new Error('Debit amount must be positive');
        }

        if (debitAmount > currentFrozenAmount) {
            throw new Error(
                `Cannot debit ${debitAmount} from frozen. Frozen amount: ${currentFrozenAmount}`
            );
        }

        return {
            newBalance: currentBalance - debitAmount,
            newFrozenAmount: currentFrozenAmount - debitAmount,
        };
    }

    /**
     * Validate wallet state consistency
     */
    validateWalletState(balance: number, frozenAmount: number): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (balance < 0) {
            errors.push('Balance cannot be negative');
        }

        if (frozenAmount < 0) {
            errors.push('Frozen amount cannot be negative');
        }

        if (frozenAmount > balance) {
            errors.push('Frozen amount cannot exceed balance');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Calculate wallet health score (0-100)
     */
    calculateWalletHealth(
        balance: number,
        frozenAmount: number,
        recentTransactionCount: number,
        failedTransactionCount: number
    ): number {
        let score = 100;

        // Deduct points for high frozen ratio
        const frozenRatio = balance > 0 ? frozenAmount / balance : 0;
        if (frozenRatio > 0.5) {
            score -= 20; // More than 50% frozen is concerning
        } else if (frozenRatio > 0.3) {
            score -= 10;
        }

        // Deduct points for failed transactions
        if (recentTransactionCount > 0) {
            const failureRate = failedTransactionCount / recentTransactionCount;
            if (failureRate > 0.3) {
                score -= 30; // High failure rate
            } else if (failureRate > 0.1) {
                score -= 15;
            }
        }

        // Deduct points for low balance
        if (balance < 1000) {
            score -= 10; // Low balance warning
        }

        return Math.max(0, Math.min(100, score));
    }
}
