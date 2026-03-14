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
    secretKey?: string;
    webhookSecret?: string;
    baseUrl?: string;
    callbackUrl?: string;
}

interface PesapalApiResponse<T = Record<string, unknown>> {
    status?: string;
    message?: string;
    data?: T;
}

interface PesapalPaymentData {
    id?: number | string;
    tx_ref?: string;
    order_tracking_id?: string;
    merchant_reference?: string;
    tracking_id?: string;
    link?: string;
    redirect_url?: string;
    status?: string;
    payment_status_description?: string;
    amount?: number;
    currency?: string;
}

export class PesapalAdapter implements IPaymentProvider {
    private readonly secretKey: string;
    private readonly webhookSecret: string;
    private readonly baseUrl: string;
    private readonly callbackUrl: string;

    constructor(config: PesapalAdapterConfig = {}) {
        this.secretKey = config.secretKey ?? process.env.PESAPAL_SECRET_KEY ?? process.env.PESAPAL_CONSUMER_SECRET ?? '';
        this.webhookSecret = config.webhookSecret ?? process.env.PESAPAL_WEBHOOK_SECRET ?? process.env.PESAPAL_SECRET_HASH ?? '';
        this.baseUrl = config.baseUrl ?? process.env.PESAPAL_URL ?? 'https://api.pesapal.com/v3';
        this.callbackUrl = config.callbackUrl ?? process.env.PESAPAL_CALLBACK_URL ?? process.env.BASE_URL ?? 'http://localhost:3000';
    }

    async processPayment(request: PaymentProviderRequest): Promise<PaymentProviderResponse> {
        if (!this.secretKey) {
            return {
                success: false,
                status: 'FAILED',
                message: 'Pesapal secret key is not configured'
            };
        }

        try {
            const payload = {
                id: request.paymentId,
                merchant_reference: request.paymentId,
                amount: request.amount,
                currency: request.currency,
                callback_url: request.callbackUrl ?? this.callbackUrl,
                description: `Payment for ${request.paymentId}`,
                billing_address: {
                    email: request.customerInfo.email,
                    phone_number: request.customerInfo.phoneNumber,
                    name: request.customerInfo.name ?? request.customerInfo.userId
                },
                payment_method: this.resolvePaymentOptions(request.method),
                meta: request.metadata ?? {}
            };

            const response = await fetch(`${this.baseUrl}/api/Transactions/SubmitOrderRequest`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const body = (await response.json()) as PesapalApiResponse<PesapalPaymentData>;
            const providerData = body.data;
            const providerStatus = this.normalizeStatus(providerData?.status ?? body.status);

            if (!response.ok || body.status?.toLowerCase() !== 'success' || !providerData) {
                return {
                    success: false,
                    status: providerStatus === 'UNKNOWN' ? 'FAILED' : providerStatus,
                    message: body.message ?? `Pesapal error (${response.status})`
                };
            }

            return {
                success: true,
                status: providerStatus === 'UNKNOWN' ? 'PROCESSING' : providerStatus,
                providerReference:
                    providerData.order_tracking_id ??
                    providerData.tx_ref ??
                    request.paymentId,
                providerTransactionId:
                    providerData.tracking_id ??
                    (providerData.id ? String(providerData.id) : undefined),
                redirectUrl: providerData.redirect_url ?? providerData.link,
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
        if (!this.secretKey) {
            return {
                paymentId: providerReference,
                providerReference,
                status: 'UNKNOWN',
                amount: 0,
                currency: 'TZS',
                failureReason: 'Pesapal secret key is not configured'
            };
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(providerReference)}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.secretKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const body = (await response.json()) as PesapalApiResponse<PesapalPaymentData>;
            const providerData = body.data;
            const normalizedStatus = this.normalizeStatus(
                providerData?.payment_status_description ??
                providerData?.status ??
                body.status
            );

            return {
                paymentId: providerReference,
                providerReference,
                status: normalizedStatus,
                amount: Number(providerData?.amount ?? 0),
                currency: typeof providerData?.currency === 'string' ? providerData.currency : 'TZS',
                completedAt: normalizedStatus === 'COMPLETED' ? new Date() : undefined,
                failureReason: response.ok ? undefined : body.message ?? `Pesapal error (${response.status})`
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

    async processPayout(_request: PayoutRequest): Promise<PayoutResponse> {
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
        if (signature === this.webhookSecret) return true;

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

    private resolvePaymentOptions(method: string): string {
        const normalized = String(method ?? '').toUpperCase();
        if (normalized === 'CARD') return 'card';
        if (normalized === 'BANK_TRANSFER') return 'banktransfer';
        if (normalized === 'WALLET') return 'account';
        return 'mobilemoney,card,banktransfer';
    }

    private normalizeStatus(status: unknown): string {
        const value = typeof status === 'string' ? status.toUpperCase() : 'UNKNOWN';
        if (value.includes('SUCCESS') || value.includes('COMPLETED') || value.includes('PAID')) return 'COMPLETED';
        if (value.includes('PENDING') || value.includes('PROCESS')) return 'PROCESSING';
        if (value.includes('CANCEL')) return 'CANCELLED';
        if (value.includes('FAIL') || value.includes('ERROR')) return 'FAILED';
        return value;
    }
}
