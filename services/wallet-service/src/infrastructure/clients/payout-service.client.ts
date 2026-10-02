import {
    InitiatePayoutDTO,
    PayoutResponse,
    PayoutStatus,
    PayoutSummary,
    PayoutHistoryResponse,
    IPayoutServiceClient
} from '../../../../../shared-contracts/payout-service-contracts';
import type { Payout } from '../../../../payout-service/src/domain/entities/payout.entity';

export class PayoutServiceClient implements IPayoutServiceClient {
    async initiatePayout(dto: InitiatePayoutDTO): Promise<PayoutResponse> {
        try {
            const { Container } = await import('../../../../payout-service/src/container');
            const container = Container.getInstance();
            const result = await container.initiatePayoutUseCase.execute({
                ...dto,
                method: dto.method as any
            });

            return {
                success: result.success,
                payoutId: result.payoutId,
                status: result.status,
                amount: result.amount,
                fee: result.fee,
                netAmount: result.netAmount,
                message: result.message
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                status: PayoutStatus.FAILED,
                message
            };
        }
    }

    async getPayoutStatus(payoutId: string): Promise<PayoutResponse> {
        try {
            const { Container } = await import('../../../../payout-service/src/container');
            const container = Container.getInstance();
            const payout: Payout | null = await container.payoutRepository.findById(payoutId);
            if (!payout) {
                return {
                    success: false,
                    status: PayoutStatus.FAILED,
                    message: 'Payout not found'
                };
            }

            return {
                success: true,
                payoutId: payout.id,
                status: payout.status as PayoutStatus,
                amount: payout.amount,
                fee: payout.fee,
                netAmount: payout.netAmount,
                message: 'Payout retrieved'
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                status: PayoutStatus.FAILED,
                message
            };
        }
    }

    /**
     * Read the persisted payout history for a single user from the payout
     * service repository (most recent first, capped by `limit`).
     */
    async getPayoutsByUserId(userId: string, limit: number = 20): Promise<PayoutHistoryResponse> {
        try {
            const { Container } = await import('../../../../payout-service/src/container');
            const container = Container.getInstance();
            const payouts: Payout[] = await container.payoutRepository.findByUserId(userId, limit);

            const summaries: PayoutSummary[] = payouts.map((payout) => this.toSummary(payout));

            return {
                success: true,
                payouts: summaries,
                total: summaries.length
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                payouts: [],
                total: 0,
                message
            };
        }
    }

    private toSummary(payout: Payout): PayoutSummary {
        const toIso = (value?: Date | null): string | null =>
            value instanceof Date ? value.toISOString() : null;

        return {
            payoutId: payout.id,
            userId: payout.userId,
            userRole: payout.userRole,
            amount: payout.amount,
            currency: payout.currency,
            fee: payout.fee,
            netAmount: payout.netAmount,
            method: String(payout.method),
            status: payout.status as PayoutStatus,
            reference: payout.reference,
            failureReason: payout.failureReason,
            createdAt: toIso(payout.createdAt),
            updatedAt: toIso(payout.updatedAt),
            processedAt: toIso(payout.processedAt),
            completedAt: toIso(payout.completedAt),
            failedAt: toIso(payout.failedAt)
        };
    }

    async cancelPayout(payoutId: string, reason: string): Promise<void> {
        const { Container } = await import('../../../../payout-service/src/container');
        const container = Container.getInstance();
        await container.cancelPayoutUseCase.execute(payoutId, reason);
    }
}
