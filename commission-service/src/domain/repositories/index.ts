/**
 * Domain Repository Interfaces
 * Defines contracts for data access operations
 */

import { Commission } from '../entities/commission.entity';
import { Payout } from '../entities/payout.entity';
import { CommissionId, OrderId, SellerId, RecipientId, PayoutId } from '../value-objects/ids.value-object';
import { CommissionStatus, RewardStatus, ReferralStatus } from '../value-objects/commission-types.value-object';
import { PayoutStatus } from '../value-objects/payout-types.value-object';
import { RecipientType } from '../value-objects/recipient-types.value-object';

export interface ICommissionRepository {
  save(commission: Commission): Promise<void>;
  findById(id: CommissionId): Promise<Commission | null>;
  findByOrderId(orderId: OrderId): Promise<Commission[]>;
  findBySellerId(sellerId: SellerId): Promise<Commission[]>;
  findByStatus(status: CommissionStatus): Promise<Commission[]>;
  findPendingCommissions(): Promise<Commission[]>;
  findApprovedCommissions(): Promise<Commission[]>;
  updateStatus(id: CommissionId, status: CommissionStatus): Promise<void>;
  getTotalCommissionForSeller(sellerId: SellerId, dateFrom?: Date, dateTo?: Date): Promise<number>;
  getCommissionSummary(sellerId: SellerId): Promise<{
    totalEarned: number;
    totalPaid: number;
    pendingAmount: number;
    averageRate: number;
  }>;
}

export interface IPayoutRepository {
  save(payout: Payout): Promise<void>;
  findById(id: PayoutId): Promise<Payout | null>;
  findByRecipientId(recipientId: RecipientId): Promise<Payout[]>;
  findByStatus(status: PayoutStatus): Promise<Payout[]>;
  findScheduledPayouts(): Promise<Payout[]>;
  findOverduePayouts(): Promise<Payout[]>;
  updateStatus(id: PayoutId, status: PayoutStatus): Promise<void>;
  getTotalPaidToRecipient(recipientId: RecipientId, dateFrom?: Date, dateTo?: Date): Promise<number>;
  getPayoutSummary(recipientId: RecipientId): Promise<{
    totalPaid: number;
    pendingAmount: number;
    scheduledAmount: number;
    averagePayout: number;
  }>;
}

export interface IReferralRepository {
  createReferral(data: {
    referrerId: RecipientId;
    refereeId: RecipientId;
    referralCode: string;
    rewardAmount?: number;
    expiresAt: Date;
  }): Promise<string>; // Returns referral ID

  findByCode(code: string): Promise<{
    id: string;
    referrerId: string;
    refereeId: string;
    status: ReferralStatus;
    rewardAmount?: number;
    completedAt?: Date;
  } | null>;

  updateStatus(id: string, status: ReferralStatus): Promise<void>;
  markCompleted(id: string, completedAt: Date): Promise<void>;
  findByReferrerId(referrerId: RecipientId): Promise<Array<{
    id: string;
    refereeId: string;
    status: ReferralStatus;
    rewardAmount?: number;
    completedAt?: Date;
  }>>;
}

export interface IRewardRepository {
  createReward(data: {
    recipientId: RecipientId;
    recipientType: RecipientType;
    type: string;
    amount: number;
    description?: string;
    expiresAt?: Date;
    referenceId?: string;
  }): Promise<string>; // Returns reward ID

  findById(id: string): Promise<{
    id: string;
    recipientId: string;
    recipientType: RecipientType;
    type: string;
    amount: number;
    status: RewardStatus;
    description?: string;
    expiresAt?: Date;
    redeemedAt?: Date;
    referenceId?: string;
  } | null>;

  updateStatus(id: string, status: RewardStatus): Promise<void>;
  markRedeemed(id: string, redeemedAt: Date): Promise<void>;
  findExpiredRewards(): Promise<Array<{
    id: string;
    recipientId: string;
    amount: number;
  }>>;
  findByRecipientId(recipientId: RecipientId): Promise<Array<{
    id: string;
    type: string;
    amount: number;
    status: RewardStatus;
    description?: string;
    expiresAt?: Date;
  }>>;
}

export interface ICommissionQueryRepository {
  getCommissionAnalytics(dateFrom: Date, dateTo: Date): Promise<{
    totalCommissions: number;
    totalAmount: number;
    averageCommission: number;
    commissionsByType: Record<string, number>;
    commissionsByStatus: Record<string, number>;
    topEarners: Array<{
      recipientId: string;
      recipientType: RecipientType;
      totalEarned: number;
      commissionCount: number;
    }>;
  }>;

  getSellerPerformanceMetrics(sellerId: SellerId, dateFrom: Date, dateTo: Date): Promise<{
    totalSales: number;
    totalCommissions: number;
    averageOrderValue: number;
    commissionRate: number;
    monthlyTrend: Array<{
      month: string;
      sales: number;
      commissions: number;
    }>;
  }>;

  getPayoutAnalytics(dateFrom: Date, dateTo: Date): Promise<{
    totalPayouts: number;
    totalAmount: number;
    averagePayout: number;
    payoutsByStatus: Record<string, number>;
    payoutsByRecipientType: Record<string, number>;
    payoutSchedule: Array<{
      date: Date;
      amount: number;
      count: number;
    }>;
  }>;
}

export interface IEventStoreRepository {
  saveEvent(event: {
    eventId: string;
    aggregateId: string;
    eventType: string;
    eventData: any;
    occurredAt: Date;
    eventVersion: number;
  }): Promise<void>;

  getEventsForAggregate(aggregateId: string): Promise<Array<{
    eventId: string;
    eventType: string;
    eventData: any;
    occurredAt: Date;
    eventVersion: number;
  }>>;

  getAllEvents(eventTypes?: string[], dateFrom?: Date, dateTo?: Date): Promise<Array<{
    eventId: string;
    aggregateId: string;
    eventType: string;
    eventData: any;
    occurredAt: Date;
    eventVersion: number;
  }>>;
}

// Unit of Work pattern for transaction management
export interface IUnitOfWork {
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getCommissionRepository(): ICommissionRepository;
  getPayoutRepository(): IPayoutRepository;
  getReferralRepository(): IReferralRepository;
  getRewardRepository(): IRewardRepository;
}
