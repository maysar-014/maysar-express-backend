import { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository';
import { Wallet, WalletStatus } from '../../domain/entities/wallet.entity';
import { Transaction, TransactionType } from '../../domain/entities/transaction.entity';

export interface WalletSagaState {
    transactionId: string;
    userId: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT' | 'FREEZE' | 'UNFREEZE';
    status: 'INITIATED' | 'VALIDATED' | 'EXECUTED' | 'RECORDED' | 'COMPLETED' | 'FAILED';
    error?: string;
    compensationSteps: string[];
}

export class WalletTransactionSaga {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly transactionRepository: ITransactionRepository,
        private readonly eventBus: any
    ) { }

    async execute(state: WalletSagaState): Promise<void> {
        try {
            state.status = 'INITIATED';

            // 1. Validate wallet status and balance
            const wallet = await this.walletRepository.findByUserId(state.userId);
            if (!wallet) {
                throw new Error(`Wallet not found for user: ${state.userId}`);
            }

            const balanceBefore = wallet.balance;
            const frozenBefore = wallet.frozenAmount;

            // 2. Perform operation and append compensation steps
            switch (state.type) {
                case 'CREDIT':
                    wallet.credit(state.amount);
                    state.compensationSteps.push('DEBIT');
                    break;
                case 'DEBIT':
                    if (!wallet.canDebit(state.amount)) {
                        throw new Error('Insufficient available balance');
                    }
                    wallet.debit(state.amount);
                    state.compensationSteps.push('CREDIT');
                    break;
                case 'FREEZE':
                    wallet.freeze(state.amount);
                    state.compensationSteps.push('UNFREEZE');
                    break;
                case 'UNFREEZE':
                    wallet.unfreeze(state.amount);
                    state.compensationSteps.push('FREEZE');
                    break;
                default:
                    throw new Error(`Unsupported transaction type: ${state.type}`);
            }

            state.status = 'EXECUTED';

            // 3. Persist a transaction record
            const transaction = new Transaction({
                id: state.transactionId,
                walletId: wallet.id,
                userId: wallet.userId,
                type: this.mapToTransactionType(state.type),
                amount: state.amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter: wallet.balance,
                frozenAmountBefore: frozenBefore,
                frozenAmountAfter: wallet.frozenAmount,
                description: `Orchestrated ${state.type} transaction`,
                createdAt: new Date()
            });

            // 4. Persist state
            await this.walletRepository.update(wallet);
            await this.transactionRepository.save(transaction);

            state.status = 'RECORDED';

            // 5. Publish a domain event on success
            await this.publishSuccessEvent(wallet, transaction);

            state.status = 'COMPLETED';
        } catch (error: any) {
            state.error = error.message;
            state.status = 'FAILED';

            // 6. Execute compensations plus status updates on failure
            await this.compensate(state);
            throw error;
        }
    }

    private async compensate(state: WalletSagaState): Promise<void> {
        while (state.compensationSteps.length > 0) {
            const step = state.compensationSteps.pop();
            try {
                const wallet = await this.walletRepository.findByUserId(state.userId);
                if (!wallet) continue;

                if (step === 'DEBIT') {
                    wallet.debit(state.amount);
                } else if (step === 'CREDIT') {
                    wallet.credit(state.amount);
                } else if (step === 'FREEZE') {
                    wallet.freeze(state.amount);
                } else if (step === 'UNFREEZE') {
                    wallet.unfreeze(state.amount);
                }

                await this.walletRepository.update(wallet);
            } catch (error) {
                // Log compensation error
                console.error(`Failed to compensate step ${step}:`, error);
            }
        }
    }

    private mapToTransactionType(type: string): TransactionType {
        switch (type) {
            case 'CREDIT': return TransactionType.CREDIT;
            case 'DEBIT': return TransactionType.DEBIT;
            case 'FREEZE': return TransactionType.FREEZE;
            case 'UNFREEZE': return TransactionType.UNFREEZE;
            default: return TransactionType.DEBIT;
        }
    }

    private async publishSuccessEvent(wallet: Wallet, transaction: Transaction): Promise<void> {
        const eventName = `Wallet.${transaction.type}.Success`;
        await this.eventBus.publish(eventName, {
            walletId: wallet.id,
            userId: wallet.userId,
            transactionId: transaction.id,
            amount: transaction.amount,
            type: transaction.type,
            timestamp: new Date()
        });
    }
}

