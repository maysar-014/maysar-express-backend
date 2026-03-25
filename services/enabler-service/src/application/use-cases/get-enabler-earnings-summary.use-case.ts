import type {
  EnablerCommissionSummary,
  IEnablerCommissionRepository
} from '../../domain/repositories/enabler-commission.repository.interface';
import type { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import type { EnablerEarningsSummaryDto } from '../dto/enabler-earnings.dto';

const toIsoString = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);

export class GetEnablerEarningsSummaryUseCase {
  constructor(
    private readonly enablerRepository: IEnablerRepository,
    private readonly commissionRepository: IEnablerCommissionRepository
  ) {}

  async execute(enablerId: string): Promise<EnablerEarningsSummaryDto> {
    const enabler = await this.enablerRepository.findById(enablerId);
    if (!enabler) {
      throw new Error('Enabler not found');
    }

    const summary = await this.commissionRepository.getSummaryByEnablerId(enablerId);
    return this.mapSummary(summary);
  }

  private mapSummary(summary: EnablerCommissionSummary): EnablerEarningsSummaryDto {
    return {
      ...summary,
      lastPaidAt: toIsoString(summary.lastPaidAt)
    };
  }
}
