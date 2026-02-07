import { ITransactionRepository } from '../../domain/repositories/transaction.repository';
import { Transaction } from '../../domain/entities/transaction.entity';

export interface GetWalletStatementDTO {
    userId: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    page?: number;
}

export interface WalletStatementResultDTO {
    transactions: Transaction[];
    totalCount: number; // For pagination if supported by repo
}

export class GetWalletStatementUseCase {
    constructor(private readonly transactionRepository: ITransactionRepository) { }

    async execute(dto: GetWalletStatementDTO): Promise<WalletStatementResultDTO> {
        // Simple implementation delegating to repository
        // In real implementation, handle date filtering and pagination properly in repo options
        const limit = dto.limit || 20;
        const transactions = await this.transactionRepository.findByUserId(dto.userId, {
            limit: limit,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });

        // Filter by date range in memory if repo doesn't support generic date query yet
        // Ideally repo should support criteria
        let filtered = transactions;
        if (dto.startDate) {
            filtered = filtered.filter(t => t.createdAt >= dto.startDate!);
        }
        if (dto.endDate) {
            filtered = filtered.filter(t => t.createdAt <= dto.endDate!);
        }

        return {
            transactions: filtered,
            totalCount: filtered.length // Placeholder
        };
    }
}
