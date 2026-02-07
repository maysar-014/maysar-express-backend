import { PaymentServiceClient, CreatePaymentDTO } from '../../infrastructure/clients/payment-service.client';
import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';

export interface TopUpWalletDTO {
    userId: string;
    amount: number;
    currency: string;
    method: string;
    customerEmail?: string;
    customerName?: string;
    phoneNumber?: string;
    callbackUrl?: string;
    auditInfo: AuditInfo;
    metadata?: Record<string, any>;
}

export interface TopUpWalletResultDTO {
    success: boolean;
    paymentId?: string;
    status?: string;
    redirectUrl?: string;
    message?: string;
}

export class TopUpWalletUseCase {
    constructor(
        private readonly paymentServiceClient: PaymentServiceClient
    ) { }

    async execute(dto: TopUpWalletDTO): Promise<TopUpWalletResultDTO> {
        // Step 1: Prepare payment request
        // Using a special orderId prefix to identify top-up payments
        const orderId = `TOPUP_${dto.userId}_${Date.now()}`;

        const paymentDto: CreatePaymentDTO = {
            orderId,
            userId: dto.userId,
            amount: dto.amount,
            currency: dto.currency || 'TZS',
            method: dto.method,
            customerEmail: dto.customerEmail,
            customerName: dto.customerName,
            phoneNumber: dto.phoneNumber,
            callbackUrl: dto.callbackUrl,
            metadata: {
                ...dto.metadata,
                type: 'WALLET_TOPUP',
                auditActor: dto.auditInfo.actor,
                auditActorType: dto.auditInfo.actorType
            }
        };

        try {
            // Step 2: Initiate payment via payment-service
            const response = await this.paymentServiceClient.createPayment(paymentDto);

            return {
                success: response.success,
                paymentId: response.data.paymentId,
                status: response.data.status,
                redirectUrl: response.data.redirectUrl,
                message: response.message
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.error || error.message || 'Failed to initiate top-up'
            };
        }
    }
}
