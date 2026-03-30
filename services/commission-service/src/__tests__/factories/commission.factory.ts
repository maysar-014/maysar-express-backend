import { Commission } from '../../domain/entities/commission.entity';
import { CommissionType, CommissionStatus } from '../../domain/value-objects/commission-types.value-object';
import { CommissionId, OrderId, SellerId } from '../../domain/value-objects/ids.value-object';
import { CommissionAmount, CommissionRate } from '../../domain/value-objects/monetary.value-object';

type CommissionFactoryOverrides = Partial<Commission>;

export class CommissionFactory {
  static create(overrides: CommissionFactoryOverrides = {}): Commission {
    return new Commission(
      overrides.id ?? CommissionId.create(),
      overrides.orderId ?? OrderId.create(),
      overrides.sellerId ?? SellerId.create(),
      overrides.amount ?? CommissionAmount.fromNumber(100),
      overrides.rate ?? CommissionRate.fromPercentage(10),
      overrides.type ?? CommissionType.SALE,
      overrides.status ?? CommissionStatus.PENDING,
      overrides.createdAt ?? new Date(),
      overrides.paidAt,
      overrides.payoutId,
      overrides.metadata ?? {}
    );
  }

  static createApproved(overrides: CommissionFactoryOverrides = {}): Commission {
    return this.create({
      ...overrides,
      status: CommissionStatus.APPROVED
    });
  }

  static createPaid(overrides: CommissionFactoryOverrides = {}): Commission {
    return this.create({
      ...overrides,
      status: CommissionStatus.PAID,
      paidAt: overrides.paidAt ?? new Date(),
      payoutId: overrides.payoutId ?? 'payout-123'
    });
  }
}
