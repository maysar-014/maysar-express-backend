import { AuditInfo, ActorType } from '../../../../wallet-service/src/domain/value-objects/audit-info.value-object';
import { Transaction, TransactionType } from '../../../../wallet-service/src/domain/entities/transaction.entity';
import { getModelPrefix, makeId } from '@shared/ids/id';

export class WalletServiceClient {
    async getBalance(userId: string): Promise<{ balance: number; availableBalance: number }> {
        const { Container } = await import('../../../../wallet-service/src/container');
        const container = Container.getInstance();
        const wallet = await container.walletRepository.findByUserId(userId);
        if (!wallet) {
            return { balance: 0, availableBalance: 0 };
        }
        const availableBalance = wallet.balance - wallet.frozenAmount;
        return { balance: wallet.balance, availableBalance };
    }

    async checkEligibility(userId: string, amount: number): Promise<{ canPayout: boolean; reason?: string }> {
        const { Container } = await import('../../../../wallet-service/src/container');
        const container = Container.getInstance();
        const wallet = await container.walletRepository.findByUserId(userId);
        if (!wallet) {
            return { canPayout: false, reason: 'Wallet not found' };
        }
        if (wallet.status !== 'ACTIVE') {
            return { canPayout: false, reason: `Wallet status is ${wallet.status}` };
        }
        const availableBalance = wallet.balance - wallet.frozenAmount;
        if (availableBalance < amount) {
            return { canPayout: false, reason: 'Insufficient available balance' };
        }
        return { canPayout: true };
    }

    async freezeFunds(data: { userId: string, amount: number, description: string }): Promise<void> {
        const { Container } = await import('../../../../wallet-service/src/container');
        const container = Container.getInstance();
        const result = await container.freezeUseCase.execute({
            userId: data.userId,
            amount: data.amount,
            description: data.description,
            correlationId: `payout_${data.userId}_${Date.now()}`,
            auditInfo: AuditInfo.create({
                actor: 'payout-service',
                actorType: ActorType.SYSTEM,
                action: 'FREEZE_FUNDS',
                reason: data.description
            })
        });

        if (!result.success) {
            throw new Error(result.message || 'Failed to freeze funds');
        }
    }

    async unfreezeFunds(data: { userId: string, amount: number, description: string }): Promise<void> {
        const { Container } = await import('../../../../wallet-service/src/container');
        const container = Container.getInstance();
        const result = await container.unfreezeUseCase.execute({
            userId: data.userId,
            amount: data.amount,
            description: data.description,
            correlationId: `payout_${data.userId}_${Date.now()}`,
            auditInfo: AuditInfo.create({
                actor: 'payout-service',
                actorType: ActorType.SYSTEM,
                action: 'UNFREEZE_FUNDS',
                reason: data.description
            })
        });

        if (!result.success) {
            throw new Error(result.message || 'Failed to unfreeze funds');
        }
    }

    async debitFrozenFunds(data: { userId: string, amount: number, description: string }): Promise<void> {
        const { Container } = await import('../../../../wallet-service/src/container');
        const container = Container.getInstance();
        const wallet = await container.walletRepository.findByUserId(data.userId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        const balanceBefore = wallet.balance;
        const frozenBefore = wallet.frozenAmount;
        wallet.debitFrozen(data.amount);
        await container.walletRepository.update(wallet);

        const transaction = new Transaction({
            id: makeId(getModelPrefix('Wallet_Transaction')),
            walletId: wallet.id,
            userId: data.userId,
            type: TransactionType.DEBIT_FROZEN,
            amount: data.amount,
            currency: wallet.currency,
            balanceBefore,
            balanceAfter: wallet.balance,
            frozenAmountBefore: frozenBefore,
            frozenAmountAfter: wallet.frozenAmount,
            description: data.description,
            createdAt: new Date(),
            correlationId: `payout_${data.userId}_${Date.now()}`,
            initiatedBy: 'payout-service',
            initiatedByType: ActorType.SYSTEM,
            reason: 'DEBIT_FROZEN',
            isReversed: false,
            isCODRelated: false,
            codConfirmationRequired: false
        });

        await container.transactionRepository.save(transaction);
    }

    async creditWallet(data: { userId: string, amount: number, description: string }): Promise<void> {
        const { Container } = await import('../../../../wallet-service/src/container');
        const container = Container.getInstance();
        const correlationId = `payout_${data.userId}_${Date.now()}`;
        const result = await container.creditUseCase.execute({
            userId: data.userId,
            amount: data.amount,
            currency: 'TZS',
            description: data.description,
            idempotencyKey: `${correlationId}_${Math.random().toString(36).slice(2, 8)}`,
            correlationId,
            auditInfo: AuditInfo.create({
                actor: 'payout-service',
                actorType: ActorType.SYSTEM,
                action: 'CREDIT_WALLET',
                reason: data.description
            })
        });

        if (!result.success) {
            throw new Error(result.message || 'Failed to credit wallet');
        }
    }
}
