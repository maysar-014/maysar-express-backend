/**
 * Refund Policy
 * Business rules for refund eligibility and processing
 * Defines refund windows, partial refund rules, and eligibility criteria
 */

export interface RefundEligibility {
    canRefund: boolean;
    reasons: string[];
    refundableAmount: number;
    refundWindow: number; // in days
}

export interface RefundWindow {
    fullRefundDays: number;
    partialRefundDays: number;
    noRefundAfterDays: number;
}

export class RefundPolicy {
    private readonly DEFAULT_FULL_REFUND_DAYS = 7;
    private readonly DEFAULT_PARTIAL_REFUND_DAYS = 14;
    private readonly DEFAULT_NO_REFUND_AFTER_DAYS = 30;
    private readonly PARTIAL_REFUND_PERCENTAGE = 0.8; // 80% refund after full refund window

    private refundWindow: RefundWindow;

    constructor(customWindow?: Partial<RefundWindow>) {
        this.refundWindow = {
            fullRefundDays: customWindow?.fullRefundDays || this.DEFAULT_FULL_REFUND_DAYS,
            partialRefundDays: customWindow?.partialRefundDays || this.DEFAULT_PARTIAL_REFUND_DAYS,
            noRefundAfterDays: customWindow?.noRefundAfterDays || this.DEFAULT_NO_REFUND_AFTER_DAYS,
        };
    }

    /**
     * Check if payment can be refunded
     */
    canRefund(
        paymentStatus: string,
        paymentAmount: number,
        refundedAmount: number,
        paymentDate: Date,
        orderStatus?: string
    ): RefundEligibility {
        const reasons: string[] = [];
        let canRefund = true;

        // Check payment status
        if (paymentStatus !== 'COMPLETED') {
            reasons.push('Payment must be completed to be refunded');
            canRefund = false;
        }

        // Check if already fully refunded
        if (refundedAmount >= paymentAmount) {
            reasons.push('Payment has already been fully refunded');
            canRefund = false;
        }

        // Check refund window
        const daysSincePayment = this.getDaysSince(paymentDate);
        if (daysSincePayment > this.refundWindow.noRefundAfterDays) {
            reasons.push(
                `Refund window expired. Maximum ${this.refundWindow.noRefundAfterDays} days`
            );
            canRefund = false;
        }

        // Check order status if provided
        if (orderStatus && !this.isRefundableOrderStatus(orderStatus)) {
            reasons.push(`Order status ${orderStatus} is not refundable`);
            canRefund = false;
        }

        const refundableAmount = this.calculateRefundAmount(
            paymentAmount,
            refundedAmount,
            paymentDate
        );

        return {
            canRefund,
            reasons,
            refundableAmount,
            refundWindow: this.getRefundWindowDays(paymentDate),
        };
    }

    /**
     * Calculate refund amount based on time elapsed
     */
    calculateRefundAmount(
        paymentAmount: number,
        alreadyRefunded: number,
        paymentDate: Date
    ): number {
        const remainingAmount = paymentAmount - alreadyRefunded;
        const daysSincePayment = this.getDaysSince(paymentDate);

        // Full refund within full refund window
        if (daysSincePayment <= this.refundWindow.fullRefundDays) {
            return remainingAmount;
        }

        // Partial refund within partial refund window
        if (daysSincePayment <= this.refundWindow.partialRefundDays) {
            return Math.round(remainingAmount * this.PARTIAL_REFUND_PERCENTAGE * 100) / 100;
        }

        // No refund after window expires
        return 0;
    }

    /**
     * Get refund window remaining days
     */
    getRefundWindow(paymentDate: Date): RefundWindow {
        return { ...this.refundWindow };
    }

    /**
     * Get remaining days in refund window
     */
    getRefundWindowDays(paymentDate: Date): number {
        const daysSincePayment = this.getDaysSince(paymentDate);
        return Math.max(0, this.refundWindow.noRefundAfterDays - daysSincePayment);
    }

    /**
     * Check if order status allows refund
     */
    private isRefundableOrderStatus(orderStatus: string): boolean {
        const refundableStatuses = [
            'PENDING',
            'CONFIRMED',
            'PROCESSING',
            'CANCELLED',
            'FAILED',
        ];
        return refundableStatuses.includes(orderStatus.toUpperCase());
    }

    /**
     * Calculate days since payment
     */
    private getDaysSince(date: Date): number {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    /**
     * Check if full refund is available
     */
    isFullRefundAvailable(paymentDate: Date): boolean {
        const daysSincePayment = this.getDaysSince(paymentDate);
        return daysSincePayment <= this.refundWindow.fullRefundDays;
    }

    /**
     * Check if partial refund is available
     */
    isPartialRefundAvailable(paymentDate: Date): boolean {
        const daysSincePayment = this.getDaysSince(paymentDate);
        return (
            daysSincePayment > this.refundWindow.fullRefundDays &&
            daysSincePayment <= this.refundWindow.partialRefundDays
        );
    }

    /**
     * Get refund percentage based on time
     */
    getRefundPercentage(paymentDate: Date): number {
        const daysSincePayment = this.getDaysSince(paymentDate);

        if (daysSincePayment <= this.refundWindow.fullRefundDays) {
            return 1.0; // 100%
        }

        if (daysSincePayment <= this.refundWindow.partialRefundDays) {
            return this.PARTIAL_REFUND_PERCENTAGE; // 80%
        }

        return 0; // 0%
    }

    /**
     * Update refund window
     */
    updateRefundWindow(newWindow: Partial<RefundWindow>): void {
        this.refundWindow = {
            ...this.refundWindow,
            ...newWindow,
        };
    }
}
