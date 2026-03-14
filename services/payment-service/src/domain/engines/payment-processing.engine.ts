/**
 * Payment Processing Engine
 * Pure business logic for payment processing decisions
 * No external dependencies, only decision-making logic
 */

import { PaymentMethodType, PaymentProvider } from '../value-objects/payment-method.value-object';

export interface PaymentProcessingStrategy {
    provider: PaymentProvider;
    method: PaymentMethodType;
    estimatedProcessingTime: number; // in seconds
    fees: {
        platformFee: number;
        providerFee: number;
        totalFee: number;
    };
    requiresRedirect: boolean;
    requiresWebhook: boolean;
}

export interface PaymentRequest {
    amount: number;
    currency: string;
    method: PaymentMethodType;
    userId: string;
    orderId: string;
}

export class PaymentProcessingEngine {
    /**
     * Select the best payment provider based on method and other factors
     */
    selectPaymentProvider(method: PaymentMethodType): PaymentProvider {
        switch (method) {
            case PaymentMethodType.WALLET:
                return PaymentProvider.INTERNAL_WALLET;

            case PaymentMethodType.MPESA:
            case PaymentMethodType.AIRTEL_MONEY:
            case PaymentMethodType.TIGO_PESA:
            case PaymentMethodType.HALOPESA:
            case PaymentMethodType.BANK_TRANSFER:
            case PaymentMethodType.CARD:
                return PaymentProvider.PESAPAL;

            default:
                throw new Error(`Unsupported payment method: ${method}`);
        }
    }

    /**
     * Calculate fees for a payment
     */
    calculateFees(amount: number, method: PaymentMethodType): {
        platformFee: number;
        providerFee: number;
        totalFee: number;
    } {
        const platformFeePercentage = 0.02; // 2% platform fee
        const providerFeePercentage = this.getProviderFeePercentage(method);

        const platformFee = amount * platformFeePercentage;
        const providerFee = amount * providerFeePercentage;
        const totalFee = platformFee + providerFee;

        return {
            platformFee: Math.round(platformFee * 100) / 100,
            providerFee: Math.round(providerFee * 100) / 100,
            totalFee: Math.round(totalFee * 100) / 100,
        };
    }

    /**
     * Get provider fee percentage based on payment method
     */
    private getProviderFeePercentage(method: PaymentMethodType): number {
        switch (method) {
            case PaymentMethodType.MPESA:
            case PaymentMethodType.AIRTEL_MONEY:
            case PaymentMethodType.TIGO_PESA:
            case PaymentMethodType.HALOPESA:
                return 0.015; // 1.5% for mobile money
            case PaymentMethodType.CARD:
                return 0.029; // 2.9% for cards
            case PaymentMethodType.BANK_TRANSFER:
                return 0.01; // 1% for bank transfers
            case PaymentMethodType.WALLET:
                return 0; // No fee for wallet
            default:
                return 0.02; // Default 2%
        }
    }

    /**
     * Validate payment request
     */
    validatePaymentRequest(request: PaymentRequest): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // Validate amount
        if (request.amount <= 0) {
            errors.push('Payment amount must be positive');
        }

        // Validate currency
        const supportedCurrencies = ['TZS', 'USD', 'EUR', 'GBP'];
        if (!supportedCurrencies.includes(request.currency.toUpperCase())) {
            errors.push(`Unsupported currency: ${request.currency}`);
        }

        // Validate method-specific requirements
        const methodValidation = this.validateMethodRequirements(
            request.method,
            request.amount,
            request.currency
        );
        errors.push(...methodValidation);

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Validate method-specific requirements
     */
    private validateMethodRequirements(
        method: PaymentMethodType,
        amount: number,
        currency: string
    ): string[] {
        const errors: string[] = [];

        // Get method limits
        const limits = this.getMethodLimits(method, currency);

        if (amount < limits.min) {
            errors.push(
                `Amount ${amount} ${currency} is below minimum ${limits.min} for ${method}`
            );
        }

        if (amount > limits.max) {
            errors.push(
                `Amount ${amount} ${currency} exceeds maximum ${limits.max} for ${method}`
            );
        }

        // Currency support check
        if (!this.methodSupportsCurrency(method, currency)) {
            errors.push(`Payment method ${method} does not support currency ${currency}`);
        }

        return errors;
    }

    /**
     * Get method limits
     */
    private getMethodLimits(
        method: PaymentMethodType,
        currency: string
    ): { min: number; max: number } {
        const currencyUpper = currency.toUpperCase();

        if (currencyUpper === 'TZS') {
            switch (method) {
                case PaymentMethodType.MPESA:
                case PaymentMethodType.AIRTEL_MONEY:
                case PaymentMethodType.TIGO_PESA:
                case PaymentMethodType.HALOPESA:
                    return { min: 500, max: 5000000 };
                case PaymentMethodType.WALLET:
                    return { min: 100, max: 10000000 };
                case PaymentMethodType.BANK_TRANSFER:
                    return { min: 1000, max: 50000000 };
                case PaymentMethodType.CARD:
                    return { min: 1000, max: 20000000 };
                default:
                    return { min: 500, max: 5000000 };
            }
        }

        // USD limits
        if (currencyUpper === 'USD') {
            return { min: 1, max: 10000 };
        }

        return { min: 0, max: Number.MAX_SAFE_INTEGER };
    }

    /**
     * Check if method supports currency
     */
    private methodSupportsCurrency(
        method: PaymentMethodType,
        currency: string
    ): boolean {
        const currencyUpper = currency.toUpperCase();

        // Mobile money methods primarily support TZS
        const mobileMoneyMethods = [
            PaymentMethodType.MPESA,
            PaymentMethodType.AIRTEL_MONEY,
            PaymentMethodType.TIGO_PESA,
            PaymentMethodType.HALOPESA,
        ];

        if (mobileMoneyMethods.includes(method)) {
            return currencyUpper === 'TZS';
        }

        // Wallet supports all currencies
        if (method === PaymentMethodType.WALLET) {
            return ['TZS', 'USD', 'EUR', 'GBP', 'KES', 'UGX'].includes(currencyUpper);
        }

        // Bank transfer and card support multiple currencies
        if (
            method === PaymentMethodType.BANK_TRANSFER ||
            method === PaymentMethodType.CARD
        ) {
            return ['TZS', 'USD', 'EUR', 'GBP'].includes(currencyUpper);
        }

        return false;
    }

    /**
     * Determine processing strategy for a payment
     */
    determineProcessingStrategy(request: PaymentRequest): PaymentProcessingStrategy {
        const provider = this.selectPaymentProvider(request.method);
        const fees = this.calculateFees(request.amount, request.method);
        const estimatedProcessingTime = this.getEstimatedProcessingTime(request.method);
        const requiresRedirect = this.methodRequiresRedirect(request.method);
        const requiresWebhook = this.methodRequiresWebhook(request.method);

        return {
            provider,
            method: request.method,
            estimatedProcessingTime,
            fees,
            requiresRedirect,
            requiresWebhook,
        };
    }

    /**
     * Get estimated processing time in seconds
     */
    private getEstimatedProcessingTime(method: PaymentMethodType): number {
        switch (method) {
            case PaymentMethodType.WALLET:
                return 1; // Instant
            case PaymentMethodType.MPESA:
            case PaymentMethodType.AIRTEL_MONEY:
            case PaymentMethodType.TIGO_PESA:
            case PaymentMethodType.HALOPESA:
                return 30; // 30 seconds for mobile money
            case PaymentMethodType.CARD:
                return 5; // 5 seconds for card
            case PaymentMethodType.BANK_TRANSFER:
                return 300; // 5 minutes for bank transfer
            default:
                return 60;
        }
    }

    /**
     * Check if method requires redirect
     */
    private methodRequiresRedirect(method: PaymentMethodType): boolean {
        return [
            PaymentMethodType.MPESA,
            PaymentMethodType.AIRTEL_MONEY,
            PaymentMethodType.TIGO_PESA,
            PaymentMethodType.HALOPESA,
            PaymentMethodType.CARD,
            PaymentMethodType.BANK_TRANSFER,
        ].includes(method);
    }

    /**
     * Check if method requires webhook
     */
    private methodRequiresWebhook(method: PaymentMethodType): boolean {
        return [
            PaymentMethodType.MPESA,
            PaymentMethodType.AIRTEL_MONEY,
            PaymentMethodType.TIGO_PESA,
            PaymentMethodType.HALOPESA,
            PaymentMethodType.CARD,
            PaymentMethodType.BANK_TRANSFER,
        ].includes(method);
    }

    /**
     * Calculate total cost including fees
     */
    calculateTotalCost(amount: number, method: PaymentMethodType): {
        subtotal: number;
        fees: number;
        total: number;
    } {
        const feeCalculation = this.calculateFees(amount, method);

        return {
            subtotal: amount,
            fees: feeCalculation.totalFee,
            total: amount + feeCalculation.totalFee,
        };
    }
}

