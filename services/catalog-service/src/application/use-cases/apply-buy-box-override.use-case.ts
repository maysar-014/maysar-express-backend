/**
 * Apply Buy Box Override Use Case
 * Validates operator role, writes an audit log entry, and upserts the override record.
 *
 * Requirements: 13
 */

import { BuyBoxRankingRepository } from '../../domain/buy-box/repositories/buy-box-ranking.repository.interface';

export interface ApplyBuyBoxOverrideParams {
  productId: string;
  sellerId: string;
  operatorId: string;
  operatorRole: string;
  reason: string;
  startAt: Date;
  endAt?: Date;
}

export class ApplyBuyBoxOverrideUseCase {
  constructor(private readonly repository: BuyBoxRankingRepository) {}

  async execute(params: ApplyBuyBoxOverrideParams): Promise<void> {
    if (params.operatorRole !== 'admin' && params.operatorRole !== 'operator') {
      throw new Error('INSUFFICIENT_PERMISSIONS');
    }

    // Write audit log before applying the override
    await this.repository.writeOperatorAuditLog({
      operatorId: params.operatorId,
      entityType: 'BuyBoxOverride',
      entityId: params.productId,
      field: 'override',
      previousValue: null,
      newValue: params,
      changedAt: new Date(),
    });

    await this.repository.upsertBuyBoxOverride({
      productId: params.productId,
      sellerId: params.sellerId,
      operatorId: params.operatorId,
      reason: params.reason,
      startAt: params.startAt,
      endAt: params.endAt,
    });
  }
}
