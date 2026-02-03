/**
 * Approve Commission Use Case
 * Handles commission approval workflow
 */

import { CommissionId } from '../../domain/value-objects/ids.value-object';
import { CommissionStatus } from '../../domain/value-objects/commission-types.value-object';
import { RecipientType } from '../../domain/value-objects/recipient-types.value-object';
import { CommissionApprovedEvent, PayoutScheduledEvent } from '../../domain/events/index';
import { CommissionPolicies } from '../../domain/policies/commission-policies';
import { ICommissionRepository, IPayoutRepository, IEventStoreRepository } from '../../domain/repositories/index';

export interface ApproveCommissionInput {
  commissionId: CommissionId;
  approverRole: string;
  approverId: string;
  autoSchedulePayout?: boolean;
}

export interface ApproveCommissionOutput {
  success: boolean;
  events: (CommissionApprovedEvent | PayoutScheduledEvent)[];
}

export class ApproveCommissionUseCase {
  constructor(
    private commissionRepository: ICommissionRepository,
    private payoutRepository: IPayoutRepository,
    private eventStore: IEventStoreRepository
  ) {}

  async execute(input: ApproveCommissionInput): Promise<ApproveCommissionOutput> {
    // Find commission
    const commission = await this.commissionRepository.findById(input.commissionId);
    if (!commission) {
      throw new Error('Commission not found');
    }

    // Validate approval permissions
    const validation = CommissionPolicies.canApproveCommission(
      commission,
      input.approverRole,
      input.approverId
    );

    if (!validation.allowed) {
      throw new Error(`Commission approval not allowed: ${validation.reason}`);
    }

    // Approve commission
    commission.approve();
    await this.commissionRepository.updateStatus(commission.id, CommissionStatus.APPROVED);

    const events: (CommissionApprovedEvent | PayoutScheduledEvent)[] = [
      new CommissionApprovedEvent(commission.id, input.approverId)
    ];

    // Auto-schedule payout if requested
    if (input.autoSchedulePayout) {
      // This would typically call a SchedulePayoutUseCase
      // For now, we'll create a basic payout scheduling event
      const payoutDate = new Date();
      payoutDate.setDate(payoutDate.getDate() + 7); // Schedule for 7 days from now

      events.push(new PayoutScheduledEvent(
        commission.id, // Using commission ID as payout ID for simplicity
        commission.sellerId,
        RecipientType.SELLER,
        commission.amount,
        payoutDate
      ));
    }

    // Store events
    for (const event of events) {
      await this.eventStore.saveEvent({
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        eventData: event,
        occurredAt: event.occurredAt,
        eventVersion: event.eventVersion
      });
    }

    return {
      success: true,
      events
    };
  }
}
