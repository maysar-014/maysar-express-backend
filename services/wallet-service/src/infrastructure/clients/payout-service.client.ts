import {
    InitiatePayoutDTO,
    PayoutResponse,
    PayoutStatus,
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

    async cancelPayout(payoutId: string, reason: string): Promise<void> {
        const { Container } = await import('../../../../payout-service/src/container');
        const container = Container.getInstance();
        await container.cancelPayoutUseCase.execute(payoutId, reason);
    }
}
