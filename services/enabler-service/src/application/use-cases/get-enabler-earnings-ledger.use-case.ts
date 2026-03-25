import type {
  EnablerCommissionLedgerEntry,
  EnablerCommissionSummary,
  IEnablerCommissionRepository
} from '../../domain/repositories/enabler-commission.repository.interface';
import type { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import type {
  EnablerEarningsLedgerEntryDto,
  EnablerEarningsLedgerResponseDto,
  EnablerEarningsSummaryDto,
  GetEnablerEarningsLedgerQueryDto
} from '../dto/enabler-earnings.dto';

const toIsoString = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);

export class GetEnablerEarningsLedgerUseCase {
  constructor(
    private readonly enablerRepository: IEnablerRepository,
    private readonly commissionRepository: IEnablerCommissionRepository
  ) {}

  async execute(
    enablerId: string,
    query: GetEnablerEarningsLedgerQueryDto = {}
  ): Promise<EnablerEarningsLedgerResponseDto> {
    const enabler = await this.enablerRepository.findById(enablerId);
    if (!enabler) {
      throw new Error('Enabler not found');
    }

    const [ledger, summary] = await Promise.all([
      this.commissionRepository.findLedgerByEnablerId(enablerId, query),
      this.commissionRepository.getSummaryByEnablerId(enablerId)
    ]);

    return {
      items: ledger.items.map((entry) => this.mapEntry(entry)),
      summary: this.mapSummary(summary),
      pagination: {
        page: ledger.page,
        limit: ledger.limit,
        total: ledger.total,
        totalPages: ledger.totalPages
      }
    };
  }

  private mapEntry(entry: EnablerCommissionLedgerEntry): EnablerEarningsLedgerEntryDto {
    return {
      id: entry.id,
      enablerId: entry.enablerId,
      enablerOrderId: entry.enablerOrderId,
      orderId: entry.orderId,
      commissionId: entry.commissionId,
      status: entry.status,
      baseCommission: entry.baseCommission,
      tierBonus: entry.tierBonus,
      performanceBonus: entry.performanceBonus,
      totalCommission: entry.totalCommission,
      protectionStatus: entry.protectionStatus,
      fraudCheckStatus: entry.fraudCheckStatus,
      approvedAt: toIsoString(entry.approvedAt),
      holdUntil: toIsoString(entry.holdUntil),
      paidAt: toIsoString(entry.paidAt),
      payoutId: entry.payoutId,
      paymentMethod: entry.paymentMethod,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    };
  }

  private mapSummary(summary: EnablerCommissionSummary): EnablerEarningsSummaryDto {
    return {
      ...summary,
      lastPaidAt: toIsoString(summary.lastPaidAt)
    };
  }
}
