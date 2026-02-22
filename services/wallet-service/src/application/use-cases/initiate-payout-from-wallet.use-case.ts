import { DebitWalletUseCase } from './debit-wallet.use-case';
import { CreditWalletUseCase } from './credit-wallet.use-case';
import { IPayoutServiceClient, PayoutMethod } from '../../../../../shared-contracts/payout-service-contracts';
import { AuditInfo, ActorType } from '../../domain/value-objects/audit-info.value-object';
import { WalletEventPublisher } from '../../infrastructure/messaging/wallet-event-publisher';
import { isPayoutEligibleRole, UserRole } from '../../../../../shared-contracts/user-service-contracts';

export interface InitiatePayoutFromWalletDTO {
    userId: string;
    userRole: string;
    amount: number;
    currency: string;
    method: PayoutMethod;
    bankDetails?: any;
    mobileMoneyDetails?: any;
    idempotencyKey: string;
    correlationId: string;
    auditInfo: AuditInfo;
}

export interface InitiatePayoutFromWalletResult {
    success: boolean;
    walletTransactionId?: string;
    payoutId?: string;
    balanceAfter?: number;
    message?: string;
}

export class InitiatePayoutFromWalletUseCase {
    constructor(
        private readonly debitWalletUseCase: DebitWalletUseCase,
        private readonly creditWalletUseCase: CreditWalletUseCase,
        private readonly payoutServiceClient: IPayoutServiceClient,
        private readonly eventPublisher: WalletEventPublisher
    ) { }

    async execute(dto: InitiatePayoutFromWalletDTO): Promise<InitiatePayoutFromWalletResult> {
        // 0. Validate Role Eligibility (Comment 2)
        // Normalize role string to UserRole enum (handles 'enabler', 'ENABLER', 'Enabler' etc.)
        const normalizedRole = dto.userRole.toUpperCase() as keyof typeof UserRole;
        const roleEnum = UserRole[normalizedRole];

        if (!roleEnum || !isPayoutEligibleRole(roleEnum)) {
            return {
                success: false,
                message: `Role ${dto.userRole} is not eligible for payouts. Only ENABLER role can perform payouts.`
            };
        }

        // 1. Debit Wallet
        const debitResult = await this.debitWalletUseCase.execute({
            userId: dto.userId,
            amount: dto.amount,
            currency: dto.currency,
            description: `Payout withdrawal via ${dto.method}`,
            idempotencyKey: `${dto.idempotencyKey}_debit`,
            correlationId: dto.correlationId,
            auditInfo: dto.auditInfo
        });

        if (!debitResult.success) {
            return {
                success: false,
                message: debitResult.message || 'Failed to debit wallet'
            };
        }

        // 2. Initiate Payout via Payout Service
        try {
            const payoutResponse = await this.payoutServiceClient.initiatePayout({
                userId: dto.userId,
                userRole: dto.userRole,
                amount: dto.amount,
                currency: dto.currency,
                method: dto.method,
                bankDetails: dto.bankDetails,
                mobileMoneyDetails: dto.mobileMoneyDetails,
                availableBalance: debitResult.balanceBefore
            });

            if (!payoutResponse.success) {
                // Compensating transaction: Credit wallet back
                await this.creditWalletUseCase.execute({
                    userId: dto.userId,
                    amount: dto.amount,
                    currency: dto.currency,
                    description: `Reversal: Payout initiation failed. Reason: ${payoutResponse.message}`,
                    idempotencyKey: `${dto.idempotencyKey}_payout_failed_reversal`,
                    correlationId: dto.correlationId,
                    auditInfo: AuditInfo.create({
                        actor: 'SYSTEM',
                        actorType: ActorType.SYSTEM,
                        action: 'PAYOUT_REVERSAL',
                        reason: `Payout failed: ${payoutResponse.message}`,
                        ipAddress: '127.0.0.1',
                        userAgent: 'Internal'
                    })
                });

                return {
                    success: false,
                    message: payoutResponse.message || 'Failed to initiate payout in payout service'
                };
            }

            // 3. Publish Success Event
            // Note: publishWalletPayoutInitiated will be added to the publisher
            await (this.eventPublisher as any).publishWalletPayoutInitiated({
                userId: dto.userId,
                userRole: dto.userRole,
                amount: dto.amount,
                currency: dto.currency,
                payoutId: payoutResponse.payoutId!,
                walletTransactionId: debitResult.transactionId!,
                timestamp: new Date()
            });

            return {
                success: true,
                walletTransactionId: debitResult.transactionId,
                payoutId: payoutResponse.payoutId,
                balanceAfter: debitResult.balanceAfter,
                message: 'Payout initiated from wallet successfully'
            };

        } catch (error: any) {
            // Compensating transaction on unexpected error
            await this.creditWalletUseCase.execute({
                userId: dto.userId,
                amount: dto.amount,
                currency: dto.currency,
                description: `Reversal: Payout initiation error. ${error.message}`,
                idempotencyKey: `${dto.idempotencyKey}_payout_error_reversal`,
                correlationId: dto.correlationId,
                auditInfo: AuditInfo.create({
                    actor: 'SYSTEM',
                    actorType: ActorType.SYSTEM,
                    action: 'PAYOUT_ERROR_REVERSAL',
                    reason: `Payout unexpected error: ${error.message}`,
                    ipAddress: '127.0.0.1',
                    userAgent: 'Internal'
                })
            });

            return {
                success: false,
                message: `Unexpected error during payout: ${error.message}`
            };
        }
    }
}
