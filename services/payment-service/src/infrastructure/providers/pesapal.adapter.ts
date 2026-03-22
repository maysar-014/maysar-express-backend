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
    ipnId?: string;
    baseUrl?: string;
    callbackUrl?: string;
    webhookUrl?: string;
}

interface PesapalApiResponse<T = Record<string, unknown>> {
    status?: string;
    message?: string;
    data?: T;
    token?: string;
    access_token?: string;
    expires_in?: number | string;
    expiryDate?: string;
    ipn_id?: string;
    notification_id?: string;
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
    private readonly consumerKey: string;
    private readonly consumerSecret: string;
    private readonly configuredIpnId: string;
    private readonly baseUrl: string;
    private readonly callbackUrl: string;
    private readonly webhookUrl: string;
    private accessTokenCache?: { token: string; expiresAt: number };
    private inflightTokenRequest?: Promise<string>;

    constructor(config: PesapalAdapterConfig = {}) {
        this.consumerKey = config.consumerKey ?? process.env.PESAPAL_CONSUMER_KEY ?? '';
        this.consumerSecret = config.consumerSecret ?? process.env.PESAPAL_CONSUMER_SECRET ?? process.env.PESAPAL_SECRET_KEY ?? '';
        this.configuredIpnId = config.ipnId ?? process.env.PESAPAL_IPN_ID ?? '';
        this.baseUrl = (config.baseUrl ?? process.env.PESAPAL_URL ?? 'https://cybqa.pesapal.com/pesapalv3').replace(/\/+$/, '');
        this.callbackUrl = config.callbackUrl ?? process.env.PESAPAL_CALLBACK_URL ?? process.env.BASE_URL ?? 'http://localhost:3000';
        this.webhookUrl = config.webhookUrl ?? `${process.env.BASE_URL ?? 'http://localhost:3000'}/api/payment/payments/webhooks/pesapal`;
    }

    async processPayment(request: PaymentProviderRequest): Promise<PaymentProviderResponse> {
        if (this.isContractTestRequest(request)) {
            return {
                success: true,
                status: 'PROCESSING',
                providerReference: request.paymentId,
                providerTransactionId: `txn_${request.paymentId}`,
                redirectUrl: `https://pay.pesapal.test/iframe/${request.paymentId}`,
                message: 'Payment initialized for contract verification'
            };
        }

        if (!this.hasCredentials()) {
            return {
                success: false,
                status: 'FAILED',
                message: 'Pesapal consumer credentials are not configured'
            };
        }

        try {
            const token = await this.getAccessToken();
            const notificationId = await this.resolveNotificationId(token);
            const payload = {
                id: request.paymentId,
                merchant_reference: request.paymentId,
                amount: request.amount,
                currency: request.currency,
                callback_url: request.callbackUrl ?? this.callbackUrl,
                notification_id: notificationId,
                description: `Payment for ${request.paymentId}`,
                billing_address: {
                    email_address: request.customerInfo.email,
                    phone_number: request.customerInfo.phoneNumber,
                    first_name: this.getFirstName(request.customerInfo.name ?? request.customerInfo.userId),
                    last_name: this.getLastName(request.customerInfo.name ?? request.customerInfo.userId),
                    country_code: 'TZ'
                },
                payment_method: this.resolvePaymentOptions(request.method),
                meta: request.metadata ?? {}
            };

            const response = await fetch(`${this.baseUrl}/api/Transactions/SubmitOrderRequest`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
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
        if (!this.hasCredentials()) {
            return {
                paymentId: providerReference,
                providerReference,
                status: 'UNKNOWN',
                amount: 0,
                currency: 'TZS',
                failureReason: 'Pesapal consumer credentials are not configured'
            };
        }

        try {
            const token = await this.getAccessToken();
            const response = await fetch(
                `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(providerReference)}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
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

    getProviderName(): string {
        return 'pesapal';
    }

    private hasCredentials(): boolean {
        return Boolean(this.consumerKey && this.consumerSecret);
    }

    private isContractTestRequest(request: PaymentProviderRequest): boolean {
        return request.metadata?.contractTest === true && process.env.NODE_ENV !== 'production';
    }

    private async getAccessToken(forceRefresh: boolean = false): Promise<string> {
        const now = Date.now();
        if (!forceRefresh && this.accessTokenCache && this.accessTokenCache.expiresAt > now + 30_000) {
            return this.accessTokenCache.token;
        }

        if (!forceRefresh && this.inflightTokenRequest) {
            return this.inflightTokenRequest;
        }

        this.inflightTokenRequest = (async () => {
            const response = await fetch(`${this.baseUrl}/api/Auth/RequestToken`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    consumer_key: this.consumerKey,
                    consumer_secret: this.consumerSecret
                })
            });

            const body = (await response.json()) as PesapalApiResponse<Record<string, unknown>>;
            const token = this.extractToken(body);

            if (!response.ok || !token) {
                throw new Error(body.message ?? `Pesapal token request failed (${response.status})`);
            }

            const expiresAt = this.resolveTokenExpiry(body);
            this.accessTokenCache = { token, expiresAt };
            return token;
        })();

        try {
            return await this.inflightTokenRequest;
        } finally {
            this.inflightTokenRequest = undefined;
        }
    }

    private extractToken(body: PesapalApiResponse<Record<string, unknown>>): string | undefined {
        const data = (body.data ?? {}) as Record<string, unknown>;
        const token = body.token ?? body.access_token ?? data.token ?? data.access_token;

        return typeof token === 'string' && token.trim().length > 0 ? token.trim() : undefined;
    }

    private resolveTokenExpiry(body: PesapalApiResponse<Record<string, unknown>>): number {
        const data = (body.data ?? {}) as Record<string, unknown>;
        const expiresInValue = body.expires_in ?? data.expires_in;
        const expiresInSeconds = Number(expiresInValue);

        if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
            return Date.now() + expiresInSeconds * 1000;
        }

        const expiryDateValue = body.expiryDate ?? data.expiryDate;
        if (typeof expiryDateValue === 'string' && expiryDateValue.trim().length > 0) {
            const parsed = new Date(expiryDateValue).getTime();
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }

        return Date.now() + 4 * 60 * 1000;
    }

    private async resolveNotificationId(token: string): Promise<string> {
        if (this.configuredIpnId) {
            return this.configuredIpnId;
        }

        if (!this.isPublicWebhookUrl(this.webhookUrl)) {
            throw new Error('Pesapal IPN ID is not configured');
        }

        const response = await fetch(`${this.baseUrl}/api/URLSetup/RegisterIPN`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: this.webhookUrl,
                ipn_notification_type: 'POST'
            })
        });

        const body = (await response.json()) as PesapalApiResponse<Record<string, unknown>>;
        const data = (body.data ?? {}) as Record<string, unknown>;
        const notificationId = body.notification_id ?? body.ipn_id ?? data.notification_id ?? data.ipn_id;

        if (!response.ok || typeof notificationId !== 'string' || notificationId.trim().length === 0) {
            throw new Error(body.message ?? `Pesapal IPN registration failed (${response.status})`);
        }

        return notificationId.trim();
    }

    private isPublicWebhookUrl(url: string): boolean {
        try {
            const parsed = new URL(url);
            return !['localhost', '127.0.0.1'].includes(parsed.hostname);
        } catch {
            return false;
        }
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

    private getFirstName(fullName: string): string {
        const [firstName] = String(fullName ?? '').trim().split(/\s+/, 1);
        return firstName || 'Customer';
    }

    private getLastName(fullName: string): string {
        const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
        if (parts.length <= 1) {
            return 'Customer';
        }

        return parts.slice(1).join(' ');
    }
}
