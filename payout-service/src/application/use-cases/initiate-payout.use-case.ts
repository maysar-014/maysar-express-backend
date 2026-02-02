import { Payout, PayoutStatus, PayoutMethod } from '../../domain/entities/payout.entity';
import { IPayoutRepository } from '../../domain/ports/payout.repository.port';
import { PayoutPolicy } from '../../domain/policies/payout.policy';

export interface InitiatePayoutDTO {
    sellerId: string;
    amount: number;
    currency: string;
    method: PayoutMethod;
    bankDetails?: {
        bankName: string;
        bankCode: string;
        accountNumber: string;
        accountName: string;
        branchCode?: string;
    };
    mobileMoneyDetails?: {
        provider: string;
        phoneNumber: string;
        accountName: string;
    };
}

export interface InitiatePayoutResultDTO {
    success: boolean;
    payoutId?: string;
    status: PayoutStatus;
    amount?: number;
    fee?: number;
    netAmount?: number;
    message?: string;
}

export class InitiatePayoutUseCase {
    constructor(
        private readonly payoutRepository: IPayoutRepository,
        private readonly payoutPolicy: PayoutPolicy
    ) { }

    async execute(dto: InitiatePayoutDTO): Promise<InitiatePayoutResultDTO> {
        // Calculate payout fee
        const fee = this.payoutPolicy.calculatePayoutFee(dto.amount, dto.method);
        const netAmount = dto.amount - fee;

        // Create payout entity
        const payoutId = this.generateId();
        const payout = new Payout({
            id: payoutId,
            sellerId: dto.sellerId,
            amount: dto.amount,
            currency: dto.currency,
            method: dto.method,
            status: PayoutStatus.PENDING,
            bankDetails: dto.bankDetails,
            mobileMoneyDetails: dto.mobileMoneyDetails,
            fee,
            netAmount,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Validate payout
        if (!payout.validate()) {
            return {
                success: false,
                status: PayoutStatus.FAILED,
                message: 'Invalid payout details',
            };
        }

        // Save payout
        await this.payoutRepository.save(payout);

        return {
            success: true,
            payoutId: payout.id,
            status: payout.status,
            amount: payout.amount,
            fee: payout.fee,
            netAmount: payout.netAmount,
            message: 'Payout initiated successfully',
        };
    }

    private generateId(): string {
        return `pyt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
