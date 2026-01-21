/**
 * Domain Events for Commission Service
 * Events that represent business facts that have occurred
 */

import { CommissionId, OrderId, SellerId, RecipientId, PayoutId } from '../value-objects/ids.value-object';
import { CommissionAmount, PayoutAmount } from '../value-objects/monetary.value-object';
import { CommissionType, CommissionStatus, RewardType } from '../value-objects/commission-types.value-object';
import { RecipientType } from '../value-objects/recipient-types.value-object';
import { PayoutStatus } from '../value-objects/payout-types.value-object';

export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly eventVersion: number = 1;

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly eventType: string
  ) {
    this.occurredAt = new Date();
  }
}

// Commission Events
export class CommissionCalculatedEvent extends DomainEvent {
  constructor(
    public readonly commissionId: CommissionId,
    public readonly orderId: OrderId,
    public readonly sellerId: SellerId,
    public readonly amount: CommissionAmount,
    public readonly type: CommissionType,
    public readonly rate: number
  ) {
    super(
      `commission-${commissionId.toString()}`,
      commissionId.toString(),
      'CommissionCalculated'
    );
  }
}

export class CommissionApprovedEvent extends DomainEvent {
  constructor(
    public readonly commissionId: CommissionId,
    public readonly approvedBy: string
  ) {
    super(
      `commission-approved-${commissionId.toString()}`,
      commissionId.toString(),
      'CommissionApproved'
    );
  }
}

export class CommissionPaidEvent extends DomainEvent {
  constructor(
    public readonly commissionId: CommissionId,
    public readonly payoutId: PayoutId
  ) {
    super(
      `commission-paid-${commissionId.toString()}`,
      commissionId.toString(),
      'CommissionPaid'
    );
  }
}

// Payout Events
export class PayoutScheduledEvent extends DomainEvent {
  constructor(
    public readonly payoutId: PayoutId,
    public readonly recipientId: RecipientId,
    public readonly recipientType: RecipientType,
    public readonly amount: PayoutAmount,
    public readonly scheduledDate: Date
  ) {
    super(
      `payout-${payoutId.toString()}`,
      payoutId.toString(),
      'PayoutScheduled'
    );
  }
}

export class PayoutProcessedEvent extends DomainEvent {
  constructor(
    public readonly payoutId: PayoutId,
    public readonly processedAt: Date,
    public readonly reference?: string
  ) {
    super(
      `payout-processed-${payoutId.toString()}`,
      payoutId.toString(),
      'PayoutProcessed'
    );
  }
}

// Reward Events
export class RewardEarnedEvent extends DomainEvent {
  constructor(
    public readonly rewardId: string,
    public readonly recipientId: RecipientId,
    public readonly recipientType: RecipientType,
    public readonly type: RewardType,
    public readonly amount: CommissionAmount,
    public readonly reason: string
  ) {
    super(
      `reward-${rewardId}`,
      rewardId,
      'RewardEarned'
    );
  }
}

export class RewardRedeemedEvent extends DomainEvent {
  constructor(
    public readonly rewardId: string,
    public readonly redeemedAt: Date
  ) {
    super(
      `reward-redeemed-${rewardId}`,
      rewardId,
      'RewardRedeemed'
    );
  }
}

// Business Process Events
export class CourierCommissionSagaStartedEvent extends DomainEvent {
  constructor(
    public readonly sagaId: string,
    public readonly courierId: RecipientId,
    public readonly deliveryId: string
  ) {
    super(
      `saga-${sagaId}`,
      sagaId,
      'CourierCommissionSagaStarted'
    );
  }
}

export class SellerCommissionSagaStartedEvent extends DomainEvent {
  constructor(
    public readonly sagaId: string,
    public readonly sellerId: SellerId,
    public readonly orderId: OrderId
  ) {
    super(
      `saga-${sagaId}`,
      sagaId,
      'SellerCommissionSagaStarted'
    );
  }
}

export class EnablerCommissionSagaStartedEvent extends DomainEvent {
  constructor(
    public readonly sagaId: string,
    public readonly enablerId: RecipientId,
    public readonly taskId: string
  ) {
    super(
      `saga-${sagaId}`,
      sagaId,
      'EnablerCommissionSagaStarted'
    );
  }
}

// External Integration Events (from other services)
export class OrderCompletedEvent extends DomainEvent {
  constructor(
    public readonly orderId: OrderId,
    public readonly sellerId: SellerId,
    public readonly totalAmount: CommissionAmount,
    public readonly completedAt: Date
  ) {
    super(
      `order-${orderId.toString()}`,
      orderId.toString(),
      'OrderCompleted'
    );
  }
}

export class DeliveryCompletedEvent extends DomainEvent {
  constructor(
    public readonly deliveryId: string,
    public readonly courierId: RecipientId,
    public readonly earnings: CommissionAmount,
    public readonly completedAt: Date
  ) {
    super(
      `delivery-${deliveryId}`,
      deliveryId,
      'DeliveryCompleted'
    );
  }
}

export class TaskCompletedEvent extends DomainEvent {
  constructor(
    public readonly taskId: string,
    public readonly enablerId: RecipientId,
    public readonly commission: CommissionAmount,
    public readonly qualityBonus?: CommissionAmount
  ) {
    super(
      `task-${taskId}`,
      taskId,
      'TaskCompleted'
    );
  }
}
