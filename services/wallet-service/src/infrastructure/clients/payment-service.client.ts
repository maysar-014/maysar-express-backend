import axios from 'axios';

export interface CreatePaymentDTO {
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    method: string;
    customerEmail?: string;
    customerName?: string;
    phoneNumber?: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
}

export interface PaymentResponse {
    success: boolean;
    data: {
        paymentId: string;
        status: string;
        redirectUrl?: string;
        providerReference?: string;
    };
    message?: string;
}

export class PaymentServiceClient {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl || process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3003';
    }

    async createPayment(dto: CreatePaymentDTO): Promise<PaymentResponse> {
        const response = await axios.post(`${this.baseUrl}/api/payments`, dto);
        return response.data;
    }

    async getPaymentStatus(paymentId: string): Promise<any> {
        const response = await axios.get(`${this.baseUrl}/api/payments/${paymentId}`);
        return response.data;
    }
}
