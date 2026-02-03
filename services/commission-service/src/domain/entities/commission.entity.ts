import { CommissionType, CommissionStatus } from '../value-objects/commission-types.value-object';
import { CommissionId, OrderId, SellerId } from '../value-objects/ids.value-object';
import { CommissionAmount, CommissionRate } from '../value-objects/monetary.value-object';

export class Commission {
  constructor(
    public readonly id: CommissionId,
    public readonly orderId: OrderId,
    public readonly sellerId: SellerId,
    public readonly amount: CommissionAmount,
    public readonly rate: CommissionRate,
    public readonly type: CommissionType,
    public status: CommissionStatus,
    public readonly createdAt: Date,
    public paidAt?: Date,
    public payoutId?: string,
    public metadata?: Record<string, any>
  ) {}

  /**
   * Mark commission as paid
   */
  markAsPaid(payoutId: string): void {
    if (this.status !== CommissionStatus.APPROVED) {
      throw new Error('Only approved commissions can be marked as paid');
    }
    this.status = CommissionStatus.PAID;
    this.paidAt = new Date();
    this.payoutId = payoutId;
  }

  /**
   * Approve commission for payment
   */
  approve(): void {
    if (this.status !== CommissionStatus.PENDING) {
      throw new Error('Only pending commissions can be approved');
    }
    this.status = CommissionStatus.APPROVED;
  }

  /**
   * Reject commission
   */
  reject(): void {
    if (this.status !== CommissionStatus.PENDING) {
      throw new Error('Only pending commissions can be rejected');
    }
    this.status = CommissionStatus.REJECTED;
  }

  /**
   * Check if commission is payable
   */
  isPayable(): boolean {
    return this.status === CommissionStatus.APPROVED;
  }

  /**
   * Check if commission is pending
   */
  isPending(): boolean {
    return this.status === CommissionStatus.PENDING;
  }

  /**
   * Get commission age in days
   */
  getAgeInDays(): number {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }
}
