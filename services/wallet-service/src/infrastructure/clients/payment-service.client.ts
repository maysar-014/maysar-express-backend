import type { ProcessPaymentDTO, PaymentResultDTO } from '../../../../payment-service/src/application/use-cases/process-payment.use-case';
import type { PaymentStatusDTO } from '../../../../payment-service/src/application/use-cases/check-payment-status.use-case';

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
    metadata?: Record<string, unknown>;
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
    async createPayment(dto: CreatePaymentDTO): Promise<PaymentResponse> {
        const { Container } = await import('../../../../payment-service/src/container');
        const container = Container.getInstance();

        const payload: ProcessPaymentDTO = {
            orderId: dto.orderId,
            userId: dto.userId,
            amount: dto.amount,
            currency: dto.currency,
            method: dto.method as ProcessPaymentDTO['method'],
            customerInfo: {
                email: dto.customerEmail,
                phoneNumber: dto.phoneNumber,
                name: dto.customerName,
                ipAddress: typeof dto.metadata?.ipAddress === 'string' ? dto.metadata.ipAddress : '0.0.0.0',
                deviceFingerprint: typeof dto.metadata?.deviceFingerprint === 'string'
                    ? dto.metadata.deviceFingerprint
                    : 'internal'
            },
            metadata: {
                ...dto.metadata,
                callbackUrl: dto.callbackUrl
            }
        };

        const result: PaymentResultDTO = await container.processPaymentUseCase.execute(payload);
        return {
            success: result.success,
            data: {
                paymentId: result.paymentId,
                status: result.status,
                redirectUrl: result.redirectUrl,
                providerReference: result.providerReference
            },
            message: result.message
        };
    }

    async getPaymentStatus(paymentId: string): Promise<{ success: boolean; data?: PaymentStatusDTO | null }> {
        const { Container } = await import('../../../../payment-service/src/container');
        const container = Container.getInstance();

        const result = await container.checkPaymentStatusUseCase.execute({ paymentId });
        return {
            success: Boolean(result),
            data: result
        };
    }
}
