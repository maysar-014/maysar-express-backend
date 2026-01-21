export enum CommissionType {
  SALE = 'sale',
  REFERRAL = 'referral',
  BONUS = 'bonus',
  ADJUSTMENT = 'adjustment',
  TASK_ASSIGNMENT = 'task_assignment',
  TASK_COMPLETION = 'task_completion',
  COLLABORATION_SETUP = 'collaboration_setup'
}

export enum CommissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EARNED = 'earned'
}

export enum ReferralStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum RewardStatus {
  EARNED = 'earned',
  REDEEMED = 'redeemed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum RewardType {
  REFERRAL = 'referral',
  LOYALTY = 'loyalty',
  BONUS = 'bonus',
  MILESTONE = 'milestone',
  PROMOTIONAL = 'promotional'
}
