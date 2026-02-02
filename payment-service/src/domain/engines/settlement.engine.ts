/**
 * Settlement Engine
 * Pure business logic for payment settlement calculations
 * Handles commission splits, platform fees, and settlement rules
 */

export interface SettlementCalculation {
    totalAmount: number;
    platformFee: number;
    providerFee: number;
    sellerAmount: number;
    commissions: Commission[];
    netSettlement: number;
}

export interface Commission {
    recipient: string;
    recipientType: 'platform' | 'provider' | 'affiliate' | 'referrer';
    amount: number;
    percentage: number;
    description: string;
}

export interface SettlementRequest {
    paymentAmount: number;
    paymentMethod: string;
    sellerId: string;
    affiliateId?: string;
    referrerId?: string;
}

export class SettlementEngine {
    private readonly PLATFORM_FEE_PERCENTAGE = 0.02; // 2%
    private readonly AFFILIATE_COMMISSION_PERCENTAGE = 0.01; // 1%
    private readonly REFERRER_COMMISSION_PERCENTAGE = 0.005; // 0.5%

    /**
     * Calculate complete settlement breakdown
     */
    calculateSettlement(request: SettlementRequest): SettlementCalculation {
        const platformFee = this.calculatePlatformFee(request.paymentAmount);
        const providerFee = this.calculateProviderFee(
            request.paymentAmount,
            request.paymentMethod
        );

        const commissions = this.calculateCommissions(request);
        const totalCommissions = commissions.reduce((sum, c) => c.amount + sum, 0);

        const sellerAmount =
            request.paymentAmount - platformFee - providerFee - totalCommissions;

        return {
            totalAmount: request.paymentAmount,
            platformFee,
            providerFee,
            sellerAmount: Math.round(sellerAmount * 100) / 100,
            commissions,
            netSettlement: Math.round(sellerAmount * 100) / 100,
        };
    }

    /**
     * Split payment among multiple recipients
     */
    splitPayment(
        totalAmount: number,
        splits: Array<{ recipientId: string; percentage: number }>
    ): Array<{ recipientId: string; amount: number }> {
        // Validate splits total 100%
        const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
        if (Math.abs(totalPercentage - 1) > 0.001) {
            throw new Error(`Split percentages must total 100%, got ${totalPercentage * 100}%`);
        }

        const results: Array<{ recipientId: string; amount: number }> = [];
        let remainder = totalAmount;

        for (let i = 0; i < splits.length; i++) {
            const split = splits[i];
            let amount: number;

            if (i === splits.length - 1) {
                // Last recipient gets remainder to handle rounding
                amount = remainder;
            } else {
                amount = Math.floor(totalAmount * split.percentage * 100) / 100;
                remainder -= amount;
            }

            results.push({
                recipientId: split.recipientId,
                amount,
            });
        }

        return results;
    }

    /**
     * Calculate platform fee
     */
    calculatePlatformFee(amount: number): number {
        const fee = amount * this.PLATFORM_FEE_PERCENTAGE;
        return Math.round(fee * 100) / 100;
    }

    /**
     * Calculate provider fee based on payment method
     */
    calculateProviderFee(amount: number, paymentMethod: string): number {
        const feePercentage = this.getProviderFeePercentage(paymentMethod);
        const fee = amount * feePercentage;
        return Math.round(fee * 100) / 100;
    }

    /**
     * Get provider fee percentage
     */
    private getProviderFeePercentage(paymentMethod: string): number {
        switch (paymentMethod.toUpperCase()) {
            case 'MPESA':
            case 'AIRTEL_MONEY':
            case 'TIGO_PESA':
            case 'HALOPESA':
                return 0.015; // 1.5%
            case 'CARD':
                return 0.029; // 2.9%
            case 'BANK_TRANSFER':
                return 0.01; // 1%
            case 'WALLET':
                return 0; // No fee
            default:
                return 0.02; // Default 2%
        }
    }

    /**
     * Calculate all commissions
     */
    private calculateCommissions(request: SettlementRequest): Commission[] {
        const commissions: Commission[] = [];

        // Affiliate commission
        if (request.affiliateId) {
            const affiliateCommission = this.calculateAffiliateCommission(
                request.paymentAmount
            );
            commissions.push({
                recipient: request.affiliateId,
                recipientType: 'affiliate',
                amount: affiliateCommission,
                percentage: this.AFFILIATE_COMMISSION_PERCENTAGE,
                description: 'Affiliate commission',
            });
        }

        // Referrer commission
        if (request.referrerId) {
            const referrerCommission = this.calculateReferrerCommission(
                request.paymentAmount
            );
            commissions.push({
                recipient: request.referrerId,
                recipientType: 'referrer',
                amount: referrerCommission,
                percentage: this.REFERRER_COMMISSION_PERCENTAGE,
                description: 'Referrer commission',
            });
        }

        return commissions;
    }

    /**
     * Calculate affiliate commission
     */
    private calculateAffiliateCommission(amount: number): number {
        const commission = amount * this.AFFILIATE_COMMISSION_PERCENTAGE;
        return Math.round(commission * 100) / 100;
    }

    /**
     * Calculate referrer commission
     */
    private calculateReferrerCommission(amount: number): number {
        const commission = amount * this.REFERRER_COMMISSION_PERCENTAGE;
        return Math.round(commission * 100) / 100;
    }

    /**
     * Apply platform fees to amount
     */
    applyPlatformFees(amount: number, paymentMethod: string): {
        originalAmount: number;
        platformFee: number;
        providerFee: number;
        totalFees: number;
        netAmount: number;
    } {
        const platformFee = this.calculatePlatformFee(amount);
        const providerFee = this.calculateProviderFee(amount, paymentMethod);
        const totalFees = platformFee + providerFee;
        const netAmount = amount - totalFees;

        return {
            originalAmount: amount,
            platformFee,
            providerFee,
            totalFees: Math.round(totalFees * 100) / 100,
            netAmount: Math.round(netAmount * 100) / 100,
        };
    }

    /**
     * Calculate seller payout amount
     */
    calculateSellerPayout(
        paymentAmount: number,
        paymentMethod: string,
        hasAffiliate: boolean = false,
        hasReferrer: boolean = false
    ): number {
        const platformFee = this.calculatePlatformFee(paymentAmount);
        const providerFee = this.calculateProviderFee(paymentAmount, paymentMethod);

        let deductions = platformFee + providerFee;

        if (hasAffiliate) {
            deductions += this.calculateAffiliateCommission(paymentAmount);
        }

        if (hasReferrer) {
            deductions += this.calculateReferrerCommission(paymentAmount);
        }

        const payout = paymentAmount - deductions;
        return Math.round(payout * 100) / 100;
    }
}
