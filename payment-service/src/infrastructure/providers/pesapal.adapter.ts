/**
 * Pesapal Payment Provider Adapter
 * Implements IPaymentProvider for Pesapal integration
 * Supports Tanzanian mobile money and other payment methods
 */

import {
    IPaymentProvider,
    PaymentProviderRequest,
    PaymentProviderResponse,
    PaymentStatusResponse,
    PayoutRequest,
    PayoutResponse,
    WebhookPayload,
} from '../../domain/ports/payment-provider.port';

export class PesapalAdapter implements IPaymentProvider {
    private readonly pesapalUrl: string;
    private readonly consumerKey: string;
    private readonly consumerSecret: string;
    private readonly baseUrl: string;
    private tokenCache: { token: string; expiresAt: number } | null = null;

    constructor() {
        this.pesapalUrl = process.env.PESAPAL_URL || 'https://cybqa.pesapal.com/pesapalv3';
        this.consumerKey = process.env.PESAPAL_CONSUMER_KEY || '';
        this.consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || '';
        this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        if (!this.consumerKey || !this.consumerSecret) {
            throw new Error('Pesapal credentials not configured');
        }
    }

    async processPayment(request: PaymentProviderRequest): Promise<PaymentProviderResponse> {
        try {
            const token = await this.getAccessToken();
            const notificationId = await this.getNotificationId(token);

            const paymentData = {
                id: request.paymentId,
                currency: request.currency,
                amount: request.amount,
                description: `Payment for order ${request.metadata?.orderId || request.paymentId}`,
                callback_url: request.callbackUrl || `${this.baseUrl}/api/payments/callback`,
                notification_id: notificationId,
                billing_address: {
                    email_address: request.customerInfo.email || 'customer@example.com',
                    phone_number: request.customerInfo.phoneNumber || '',
                    country_code: 'TZ',
                    first_name: request.customerInfo.name?.split(' ')[0] || 'Customer',
                    last_name: request.customerInfo.name?.split(' ').slice(1).join(' ') || 'Name',
                },
            };

            const response = await fetch(`${this.pesapalUrl}/api/Transactions/SubmitOrderRequest`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData),
            });

            if (!response.ok) {
                throw new Error(`Pesapal API error: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.status === '200' || result.order_tracking_id) {
                return {
                    success: true,
                    providerReference: result.order_tracking_id,
                    providerTransactionId: result.merchant_reference || request.paymentId,
                    redirectUrl: result.redirect_url,
                    status: 'PROCESSING',
                    message: 'Payment initiated successfully',
                    metadata: {
                        pesapalOrderId: result.order_tracking_id,
                        merchantReference: result.merchant_reference,
                    },
                };
            } else {
                return {
                    success: false,
                    status: 'FAILED',
                    message: result.message || 'Payment processing failed',
                };
            }
        } catch (error) {
            return {
                success: false,
                status: 'FAILED',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async checkPaymentStatus(providerReference: string): Promise<PaymentStatusResponse> {
        try {
            const token = await this.getAccessToken();

            const response = await fetch(
                `${this.pesapalUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${providerReference}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Pesapal API error: ${response.statusText}`);
            }

            const result = await response.json();

            const status = this.mapPesapalStatus(result.payment_status_description);
            const isCompleted = result.payment_status_description?.toLowerCase() === 'completed';

            return {
                paymentId: result.merchant_reference || '',
                providerReference,
                status,
                amount: result.amount || 0,
                currency: result.currency || 'TZS',
                completedAt: isCompleted ? new Date() : undefined,
                failureReason: !isCompleted && status === 'FAILED' ? result.payment_status_description : undefined,
            };
        } catch (error) {
            throw new Error(`Failed to check payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async processPayout(request: PayoutRequest): Promise<PayoutResponse> {
        try {
            const token = await this.getAccessToken();

            const payoutData = {
                amount: request.amount,
                currency: request.currency,
                account_number: request.recipientInfo.accountNumber || request.recipientInfo.phoneNumber,
                account_type: request.method === 'BANK_TRANSFER' ? 'bank' : 'mobile_money',
                bank_code: request.recipientInfo.bankCode,
                account_name: request.recipientInfo.accountName,
                reference: request.payoutId,
                description: `Payout for seller ${request.recipientInfo.sellerId}`,
            };

            const response = await fetch(`${this.pesapalUrl}/api/Payouts/ProcessPayout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payoutData),
            });

            if (!response.ok) {
                throw new Error(`Pesapal API error: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.status === 'success' || result.payout_id) {
                return {
                    success: true,
                    providerPayoutId: result.payout_id,
                    status: 'PROCESSING',
                    message: 'Payout initiated successfully',
                    estimatedCompletionTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                };
            } else {
                return {
                    success: false,
                    status: 'FAILED',
                    message: result.message || 'Payout processing failed',
                };
            }
        } catch (error) {
            return {
                success: false,
                status: 'FAILED',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async handleWebhook(payload: WebhookPayload): Promise<void> {
        // Webhook handling logic
        console.log('Pesapal webhook received:', payload);

        // The actual webhook processing would be handled by the webhook event handler
        // This method is primarily for validation and initial processing
    }

    verifyWebhookSignature(payload: string, signature: string): boolean {
        // Pesapal uses HMAC-SHA256 for webhook signatures
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', this.consumerSecret)
            .update(payload)
            .digest('hex');

        return expectedSignature === signature;
    }

    getProviderName(): string {
        return 'PESAPAL';
    }

    /**
     * Get access token with caching
     */
    private async getAccessToken(): Promise<string> {
        // Check cache
        if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
            return this.tokenCache.token;
        }

        const response = await fetch(`${this.pesapalUrl}/api/Auth/RequestToken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                consumer_key: this.consumerKey,
                consumer_secret: this.consumerSecret,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to get Pesapal access token: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.token) {
            throw new Error('No token in Pesapal response');
        }

        // Cache token for 10 minutes (Pesapal tokens typically expire after 5 minutes)
        this.tokenCache = {
            token: result.token,
            expiresAt: Date.now() + 10 * 60 * 1000,
        };

        return result.token;
    }

    /**
     * Get or register IPN notification ID
     */
    private async getNotificationId(token: string): Promise<string> {
        // In production, this should be cached or stored in database
        // For now, we'll register it each time (Pesapal handles duplicates)
        const response = await fetch(`${this.pesapalUrl}/api/URLSetup/RegisterIPN`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: `${this.baseUrl}/api/webhooks/pesapal`,
                ipn_notification_type: 'GET',
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to register IPN: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.ipn_id) {
            throw new Error('No IPN ID in response');
        }

        return result.ipn_id;
    }

    /**
     * Map Pesapal status to internal status
     */
    private mapPesapalStatus(pesapalStatus: string): string {
        switch (pesapalStatus?.toLowerCase()) {
            case 'completed':
                return 'COMPLETED';
            case 'failed':
                return 'FAILED';
            case 'cancelled':
                return 'CANCELLED';
            case 'pending':
            case 'processing':
                return 'PROCESSING';
            default:
                return 'PENDING';
        }
    }
}
