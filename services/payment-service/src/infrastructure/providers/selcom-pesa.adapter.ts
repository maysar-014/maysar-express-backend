import {
    IPaymentProvider,
    PaymentProviderRequest,
    PaymentProviderResponse,
    PaymentStatusResponse,
    PayoutRequest,
    PayoutResponse,
    WebhookPayload
} from '../../domain/repositories/payment-provider.gateway';

interface SelcomPesaAdapterConfig {
    merchantCode?: string;
    apiKey?: string;
    baseUrl?: string;
    callbackUrl?: string;
}

/**
 * Selcom Pesa placeholder adapter.
 *
 * The live external payment integration has been removed. This adapter is intentionally
 * non-networked for now so the payment service can ship without a third-party
 * payment API dependency until the Selcom Pesa contract is finalized.
 */
export class SelcomPesaAdapter implements IPaymentProvider {
    private readonly merchantCode?: string;
    private readonly apiKey?: string;
    private readonly baseUrl?: string;
    private readonly callbackUrl?: string;

    constructor(config: SelcomPesaAdapterConfig = {}) {
        this.merchantCode = config.merchantCode ?? process.env.SELCOM_PESA_MERCHANT_CODE;
        this.apiKey = config.apiKey ?? process.env.SELCOM_PESA_API_KEY;
        this.baseUrl = (config.baseUrl ?? process.env.SELCOM_PESA_BASE_URL ?? '').replace(/\/+$/, '');
        this.callbackUrl = config.callbackUrl ?? process.env.SELCOM_PESA_CALLBACK_URL ?? process.env.BASE_URL ?? 'http://localhost:3000';
    }

    async processPayment(request: PaymentProviderRequest): Promise<PaymentProviderResponse> {
        if (request.metadata?.contractTest === true && process.env.NODE_ENV !== 'production') {
            return {
                success: true,
                status: 'PROCESSING',
                providerReference: request.paymentId,
                providerTransactionId: `txn_${request.paymentId}`,
                redirectUrl: `https://selcom.example/checkout/${request.paymentId}`,
                message: 'Payment initialized for contract verification'
            };
        }

        return {
            success: false,
            status: 'FAILED',
            message: 'Selcom Pesa is not enabled yet',
            metadata: {
                provider: this.getProviderName(),
                merchantCode: this.merchantCode,
                baseUrl: this.baseUrl || undefined,
                callbackUrl: this.callbackUrl
            }
        };
    }

    async checkPaymentStatus(providerReference: string): Promise<PaymentStatusResponse> {
        return {
            paymentId: providerReference,
            providerReference,
            status: 'UNKNOWN',
            amount: 0,
            currency: 'TZS',
            failureReason: 'Selcom Pesa is not enabled yet'
        };
    }

    async processPayout(_request: PayoutRequest): Promise<PayoutResponse> {
        return {
            success: false,
            status: 'NOT_SUPPORTED',
            message: 'Payouts are not enabled for Selcom Pesa yet',
            estimatedCompletionTime: undefined
        };
    }

    async handleWebhook(_payload: WebhookPayload): Promise<void> {
        // No-op until the Selcom webhook contract is finalized.
    }

    getProviderName(): string {
        return 'selcom-pesa';
    }
}
