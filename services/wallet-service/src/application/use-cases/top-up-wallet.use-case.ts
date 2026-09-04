import { PaymentServiceClient, CreatePaymentDTO } from '../../infrastructure/clients/payment-service.client';
import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { isTopUpEligibleRole, UserRole } from '../../../../../shared-contracts/user-service-contracts';
import { CreditWalletUseCase } from './credit-wallet.use-case';
import { v4 as uuidv4 } from 'uuid';
import { ActorType } from '../../domain/value-objects/audit-info.value-object';

export interface TopUpWalletDTO {
    userId: string;
    userRole: string;
    amount: number;
    currency: string;
    method: string;
    customerEmail?: string;
    customerName?: string;
    phoneNumber?: string;
    callbackUrl?: string;
    auditInfo: AuditInfo;
    metadata?: Record<string, unknown>;
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
        private readonly paymentServiceClient: PaymentServiceClient,
        private readonly creditWalletUseCase?: CreditWalletUseCase
    ) { }

    async execute(dto: TopUpWalletDTO): Promise<TopUpWalletResultDTO> {
        // Step 0: Validate role eligibility for top-up
        const normalizedRole = dto.userRole.toUpperCase() as keyof typeof UserRole;
        const roleEnum = UserRole[normalizedRole];

        if (!roleEnum || !isTopUpEligibleRole(roleEnum)) {
            return {
                success: false,
                message: `Role ${dto.userRole} is not eligible for wallet top-up. Only BUYER and SELLER roles can top up.`
            };
        }

        // Step 0b: Admin/system direct credit — bypass payment provider entirely.
        // Used when an admin tops up a wallet without going through an external payment provider.
        if (dto.method === 'ADMIN_CREDIT') {
            if (!this.creditWalletUseCase) {
                return { success: false, message: 'Admin credit not available: CreditWalletUseCase not injected' };
            }
            const orderId = `TOPUP_${dto.userId}_${Date.now()}`;
            const idempotencyKey = `admin-credit-${orderId}`;
            try {
                await this.creditWalletUseCase.execute({
                    userId: dto.userId,
                    amount: dto.amount,
                    currency: dto.currency || 'TZS',
                    description: `Admin wallet top-up`,
                    idempotencyKey,
                    correlationId: uuidv4(),
                    auditInfo: dto.auditInfo,
                    metadata: {
                        ...dto.metadata,
                        type: 'ADMIN_CREDIT',
                        auditActor: dto.auditInfo.actor,
                        auditActorType: dto.auditInfo.actorType
                    }
                });
                return {
                    success: true,
                    paymentId: orderId,
                    status: 'COMPLETED',
                    message: 'Admin credit applied successfully'
                };
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Admin credit failed';
                return { success: false, message: msg };
            }
        }

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

            if (!response.success) {
                return {
                    success: false,
                    paymentId: response.data?.paymentId,
                    status: response.data?.status,
                    message: response.message
                };
            }

            // Step 3: Synchronously credit the wallet balance so funds are immediately available.
            // In a fully async system this would be event-driven (PaymentCompleted → credit wallet).
            // In the monolith, we do it synchronously to avoid the async gap.
            if (this.creditWalletUseCase) {
                try {
                    const idempotencyKey = `topup-credit-${orderId}`;
                    await this.creditWalletUseCase.execute({
                        userId: dto.userId,
                        amount: dto.amount,
                        currency: dto.currency || 'TZS',
                        description: `Wallet top-up via payment ${response.data.paymentId}`,
                        referenceType: 'topup',
                        referenceId: orderId,
                        idempotencyKey,
                        correlationId: uuidv4(),
                        auditInfo: dto.auditInfo,
                        metadata: {
                            paymentId: response.data.paymentId,
                            type: 'WALLET_TOPUP'
                        }
                    });
                } catch (creditError: unknown) {
                    // Log but don't fail the topup — the payment was already processed
                    console.warn('[TopUp] Wallet credit after payment failed:', creditError instanceof Error ? creditError.message : creditError);
                }
            }

            return {
                success: true,
                paymentId: response.data.paymentId,
                status: response.data.status,
                redirectUrl: response.data.redirectUrl,
                message: response.message
            };
        } catch (error: unknown) {
            const err = error as Error & { response?: { data?: { error?: string } } };
            return {
                success: false,
                message: err.response?.data?.error || err.message || 'Failed to initiate top-up'
            };
        }
    }
}
