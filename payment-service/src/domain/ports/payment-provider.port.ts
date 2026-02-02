/**
 * Payment Provider Port
 * Interface defining payment provider operations
 * Implementations: Pesapal, Internal Wallet
 */

export interface PaymentProviderRequest {
    paymentId: string;
    amount: number;
    currency: string;
    method: string;
    customerInfo: {
        userId: string;
        email?: string;
        phoneNumber?: string;
        name?: string;
    };
    callbackUrl?: string;
    metadata?: Record<string, any>;
}

export interface PaymentProviderResponse {
    success: boolean;
    providerReference?: string;
    providerTransactionId?: string;
    redirectUrl?: string;
    status: string;
    message?: string;
    metadata?: Record<string, any>;
}

export interface PaymentStatusResponse {
    paymentId: string;
    providerReference: string;
    status: string;
    amount: number;
    currency: string;
    completedAt?: Date;
    failureReason?: string;
}

export interface PayoutRequest {
    payoutId: string;
    amount: number;
    currency: string;
    method: string;
    recipientInfo: {
        sellerId: string;
        accountNumber?: string;
        phoneNumber?: string;
        bankCode?: string;
        accountName?: string;
    };
    metadata?: Record<string, any>;
}

export interface PayoutResponse {
    success: boolean;
    providerPayoutId?: string;
    status: string;
    message?: string;
    estimatedCompletionTime?: Date;
}

export interface WebhookPayload {
    eventType: string;
    providerReference: string;
    status: string;
    amount?: number;
    currency?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface IPaymentProvider {
    /**
     * Process a payment
     */
    processPayment(request: PaymentProviderRequest): Promise<PaymentProviderResponse>;

    /**
     * Check payment status
     */
    checkPaymentStatus(providerReference: string): Promise<PaymentStatusResponse>;

    /**
     * Process a payout
     */
    processPayout(request: PayoutRequest): Promise<PayoutResponse>;

    /**
     * Handle webhook callback
     */
    handleWebhook(payload: WebhookPayload): Promise<void>;

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean;

    /**
     * Get provider name
     */
    getProviderName(): string;
}
