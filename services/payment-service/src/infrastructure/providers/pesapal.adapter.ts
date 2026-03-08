import { createHmac, timingSafeEqual } from 'crypto';
import {
    IPaymentProvider,
    PaymentProviderRequest,
    PaymentProviderResponse,
    PaymentStatusResponse,
    PayoutRequest,
    PayoutResponse,
    WebhookPayload
} from '../../domain/repositories/payment-provider.gateway';

interface PesapalAdapterConfig {
    consumerKey?: string;
    consumerSecret?: string;
    baseUrl?: string;
    callbackUrl?: string;
    webhookSecret?: string;
}

interface PesapalTokenResponse {
    token?: string;
}

interface PesapalSubmitOrderResponse {
    order_tracking_id?: string;
    merchant_reference?: string;
    redirect_url?: string;
    status?: string;
    message?: string;
}

export class PesapalAdapter implements IPaymentProvider {
    private readonly consumerKey: string;
    private readonly consumerSecret: string;
    private readonly baseUrl: string;
    private readonly callbackUrl: string;
    private readonly webhookSecret: string;

    constructor(config: PesapalAdapterConfig = {}) {
        this.consumerKey = config.consumerKey ?? process.env.PESAPAL_CONSUMER_KEY ?? '';
        this.consumerSecret = config.consumerSecret ?? process.env.PESAPAL_CONSUMER_SECRET ?? '';
        this.baseUrl = config.baseUrl ?? process.env.PESAPAL_URL ?? 'https://cybqa.pesapal.com/pesapalv3';
        this.callbackUrl = config.callbackUrl ?? process.env.PESAPAL_CALLBACK_URL ?? '';
        this.webhookSecret = config.webhookSecret ?? process.env.PESAPAL_WEBHOOK_SECRET ?? this.consumerSecret;
    }

    async processPayment(request: PaymentProviderRequest): Promise<PaymentProviderResponse> {
        try {
            const token = await this.getAccessToken();
            if (!token) {
                return {
                    success: false,
                    status: 'FAILED',
                    message: 'Unable to obtain Pesapal access token'
                };
            }

            const payload = {
                id: request.paymentId,
                currency: request.currency,
                amount: request.amount,
                description: `Payment for ${request.paymentId}`,
                callback_url: request.callbackUrl ?? this.callbackUrl,
                notification_id: request.metadata?.notificationId ?? undefined,
                billing_address: {
                    email_address: request.customerInfo.email,
                    phone_number: request.customerInfo.phoneNumber,
                    country_code: request.metadata?.countryCode ?? 'TZ',
                    first_name: request.customerInfo.name
                }
            };

            const response = await fetch(`${this.baseUrl}/api/Transactions/SubmitOrderRequest`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const body = (await response.json()) as PesapalSubmitOrderResponse;
            if (!response.ok) {
                return {
                    success: false,
                    status: 'FAILED',
                    message: body.message ?? `Pesapal error (${response.status})`
                };
            }

            return {
                success: true,
                status: this.normalizeStatus(body.status),
                providerReference: body.order_tracking_id ?? body.merchant_reference,
                providerTransactionId: body.order_tracking_id,
                redirectUrl: body.redirect_url,
                message: body.message ?? 'Payment initialized'
            };
        } catch (error) {
            return {
                success: false,
                status: 'FAILED',
                message: error instanceof Error ? error.message : 'Payment processing failed'
            };
        }
    }

    async checkPaymentStatus(providerReference: string): Promise<PaymentStatusResponse> {
        const token = await this.getAccessToken();
        if (!token) {
            return {
                paymentId: providerReference,
                providerReference,
                status: 'UNKNOWN',
                amount: 0,
                currency: 'TZS',
                failureReason: 'Unable to obtain Pesapal access token'
            };
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(providerReference)}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const body = (await response.json()) as Record<string, unknown>;
            const rawStatus = typeof body.status === 'string'
                ? body.status
                : typeof body.payment_status_description === 'string'
                    ? body.payment_status_description
                    : 'UNKNOWN';

            return {
                paymentId: providerReference,
                providerReference,
                status: this.normalizeStatus(rawStatus),
                amount: Number(body.amount ?? 0),
                currency: typeof body.currency === 'string' ? body.currency : 'TZS',
                completedAt: this.normalizeStatus(rawStatus) === 'COMPLETED' ? new Date() : undefined,
                failureReason: response.ok ? undefined : `Pesapal error (${response.status})`
            };
        } catch (error) {
            return {
                paymentId: providerReference,
                providerReference,
                status: 'UNKNOWN',
                amount: 0,
                currency: 'TZS',
                failureReason: error instanceof Error ? error.message : 'Status check failed'
            };
        }
    }

    async processPayout(request: PayoutRequest): Promise<PayoutResponse> {
        return {
            success: false,
            status: 'NOT_SUPPORTED',
            message: `Payouts are not supported by ${this.getProviderName()} adapter`,
            estimatedCompletionTime: undefined
        };
    }

    async handleWebhook(_payload: WebhookPayload): Promise<void> {
        // Webhook persistence and orchestration are handled by use-cases/controllers.
    }

    verifyWebhookSignature(payload: string, signature: string): boolean {
        if (!this.webhookSecret || !signature) return false;
        const expected = createHmac('sha256', this.webhookSecret).update(payload).digest('hex');

        const providedBuffer = Buffer.from(signature, 'utf8');
        const expectedBuffer = Buffer.from(expected, 'utf8');
        if (providedBuffer.length !== expectedBuffer.length) {
            return false;
        }
        return timingSafeEqual(providedBuffer, expectedBuffer);
    }

    getProviderName(): string {
        return 'pesapal';
    }

    private async getAccessToken(): Promise<string | null> {
        if (!this.consumerKey || !this.consumerSecret) {
            return null;
        }

        const response = await fetch(`${this.baseUrl}/api/Auth/RequestToken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                consumer_key: this.consumerKey,
                consumer_secret: this.consumerSecret
            })
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as PesapalTokenResponse;
        return body.token ?? null;
    }

    private normalizeStatus(status: unknown): string {
        const value = typeof status === 'string' ? status.toUpperCase() : 'UNKNOWN';
        if (value.includes('COMPLETED') || value.includes('PAID')) return 'COMPLETED';
        if (value.includes('FAILED') || value.includes('INVALID')) return 'FAILED';
        if (value.includes('PENDING') || value.includes('PROCESS')) return 'PROCESSING';
        return value;
    }
}
