import { PayoutId, RecipientId } from '../value-objects/ids.value-object';
import { PayoutAmount } from '../value-objects/monetary.value-object';
import { RecipientType } from '../value-objects/recipient-types.value-object';
import { PayoutStatus } from '../value-objects/payout-types.value-object';

export class Payout {
  constructor(
    public readonly id: PayoutId,
    public readonly recipientId: RecipientId,
    public readonly recipientType: RecipientType,
    public readonly amount: PayoutAmount,
    public status: PayoutStatus,
    public readonly createdAt: Date,
    public scheduledDate?: Date,
    public processedDate?: Date,
    public reference?: string,
    public metadata?: Record<string, any>
  ) {}

  /**
   * Schedule payout for processing
   */
  schedule(scheduledDate: Date): void {
    if (this.status !== PayoutStatus.PENDING) {
      throw new Error('Only pending payouts can be scheduled');
    }
    this.status = PayoutStatus.SCHEDULED;
    this.scheduledDate = scheduledDate;
  }

  /**
   * Mark payout as processed
   */
  process(): void {
    if (this.status !== PayoutStatus.SCHEDULED) {
      throw new Error('Only scheduled payouts can be processed');
    }
    this.status = PayoutStatus.PROCESSED;
    this.processedDate = new Date();
  }

  /**
   * Cancel payout
   */
  cancel(): void {
    if (this.status === PayoutStatus.PROCESSED) {
      throw new Error('Processed payouts cannot be cancelled');
    }
    this.status = PayoutStatus.CANCELLED;
  }

  /**
   * Check if payout is scheduled
   */
  isScheduled(): boolean {
    return this.status === PayoutStatus.SCHEDULED;
  }

  /**
   * Check if payout is pending
   */
  isPending(): boolean {
    return this.status === PayoutStatus.PENDING;
  }

  /**
   * Check if payout is processed
   */
  isProcessed(): boolean {
    return this.status === PayoutStatus.PROCESSED;
  }

  /**
   * Get payout age in days
   */
  getAgeInDays(): number {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if payout is overdue
   */
  isOverdue(): boolean {
    if (!this.scheduledDate) return false;
    return this.scheduledDate < new Date() && this.status === PayoutStatus.SCHEDULED;
  }
}
