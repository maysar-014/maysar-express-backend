/**
 * Calculate Commission Use Case
 * Application service that orchestrates commission calculation
 */

import { Commission } from '../../domain/entities/commission.entity';
import { CommissionId, OrderId, SellerId } from '../../domain/value-objects/ids.value-object';
import { CommissionAmount, CommissionRate } from '../../domain/value-objects/monetary.value-object';
import { CommissionType, CommissionStatus } from '../../domain/value-objects/commission-types.value-object';
import { RecipientType } from '../../domain/value-objects/recipient-types.value-object';
import { CommissionCalculatedEvent } from '../../domain/events/index';
import { CommissionCalculationEngine } from '../../domain/engines/commission-calculation.engine';
import { CommissionPolicies } from '../../domain/policies/commission-policies';
import { ICommissionRepository, IEventStoreRepository } from '../../domain/repositories/index';

export interface CalculateCommissionInput {
  orderId: OrderId;
  sellerId: SellerId;
  orderAmount: CommissionAmount;
  recipientType: RecipientType;
  commissionType: CommissionType;
  baseRate?: CommissionRate;
  performanceBonus?: number;
  qualityMetrics?: {
    rating?: number;
    onTimeDelivery?: boolean;
    customerSatisfaction?: number;
  };
  specialConditions?: {
    firstOrder?: boolean;
    bulkOrder?: boolean;
    promotionalPeriod?: boolean;
  };
}

export interface CalculateCommissionOutput {
  commission: Commission;
  breakdown: {
    baseAmount: CommissionAmount;
    bonus: CommissionAmount;
    totalCommission: CommissionAmount;
    appliedRate: CommissionRate;
  };
  events: CommissionCalculatedEvent[];
}

export class CalculateCommissionUseCase {
  constructor(
    private commissionRepository: ICommissionRepository,
    private eventStore: IEventStoreRepository
  ) {}

  async execute(input: CalculateCommissionInput): Promise<CalculateCommissionOutput> {
    // Validate business rules
    const validation = CommissionPolicies.canCreateCommission(
      input.orderAmount,
      input.commissionType,
      input.recipientType
    );

    if (!validation.allowed) {
      throw new Error(`Commission creation not allowed: ${validation.reason}`);
    }

    // Calculate commission using domain engine
    const calculationResult = CommissionCalculationEngine.calculateCommission({
      orderAmount: input.orderAmount,
      recipientType: input.recipientType,
      commissionType: input.commissionType,
      baseRate: input.baseRate,
      performanceBonus: input.performanceBonus,
      qualityMetrics: input.qualityMetrics,
      specialConditions: input.specialConditions
    });

    // Create commission entity
    const commission = new Commission(
      CommissionId.create(),
      input.orderId,
      input.sellerId,
      calculationResult.totalCommission,
      calculationResult.appliedRate,
      input.commissionType,
      CommissionStatus.PENDING,
      new Date()
    );

    // Save commission
    await this.commissionRepository.save(commission);

    // Create domain events
    const events = [
      new CommissionCalculatedEvent(
        commission.id,
        commission.orderId,
        commission.sellerId,
        commission.amount,
        commission.type,
        commission.rate.toNumber()
      )
    ];

    // Store events
    for (const event of events) {
      await this.eventStore.saveEvent({
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        eventData: {
          commissionId: event.commissionId.toString(),
          orderId: event.orderId.toString(),
          sellerId: event.sellerId.toString(),
          amount: event.amount.toNumber(),
          type: event.type,
          rate: event.rate
        },
        occurredAt: event.occurredAt,
        eventVersion: event.eventVersion
      });
    }

    return {
      commission,
      breakdown: {
        baseAmount: calculationResult.breakdown.baseAmount,
        bonus: calculationResult.bonus,
        totalCommission: calculationResult.totalCommission,
        appliedRate: calculationResult.appliedRate
      },
      events
    };
  }
}
