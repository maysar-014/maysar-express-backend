import { VelocityCheckPolicy, VelocityResult } from '../../domain/policies/velocity-check.policy';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository';
import { Money } from '../../domain/value-objects/money.value-object';

export class VelocityCheckService {
    constructor(
        private readonly policy: VelocityCheckPolicy,
        private readonly transactionRepository: ITransactionRepository
    ) { }

    async checkVelocity(userId: string, amount: Money): Promise<VelocityResult> {
        // Fetch recent transactions (e.g., last 24 hours) for the user
        // Optimally, repository should support fetching by time range
        const recentTransactions = await this.transactionRepository.findByUserId(userId, {
            limit: 100, // Reasonable limit for velocity check
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });

        return this.policy.checkVelocity(recentTransactions, amount);
    }
}
