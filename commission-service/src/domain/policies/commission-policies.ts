/**
 * Commission Policies
 * Business rules and constraints for commission operations
 */

import { Commission } from '../entities/commission.entity';
import { Payout } from '../entities/payout.entity';
import { CommissionAmount, CommissionRate } from '../value-objects/monetary.value-object';
import { CommissionType, CommissionStatus } from '../value-objects/commission-types.value-object';
import { RecipientType } from '../value-objects/recipient-types.value-object';

export class CommissionPolicies {
  /**
   * Business rules for commission creation
   */
  static canCreateCommission(
    amount: CommissionAmount,
    type: CommissionType,
    recipientType: RecipientType
  ): { allowed: boolean; reason?: string } {
    // Minimum commission amounts
    const minAmounts: Record<RecipientType, Record<CommissionType, number>> = {
      [RecipientType.SELLER]: {
        [CommissionType.SALE]: 1.00,
        [CommissionType.REFERRAL]: 0.50,
        [CommissionType.BONUS]: 0.10,
        [CommissionType.ADJUSTMENT]: 0.00,
        [CommissionType.TASK_ASSIGNMENT]: 0.00,
        [CommissionType.TASK_COMPLETION]: 0.00,
        [CommissionType.COLLABORATION_SETUP]: 0.00
      },
      [RecipientType.COURIER]: {
        [CommissionType.SALE]: 0.00,
        [CommissionType.REFERRAL]: 0.00,
        [CommissionType.BONUS]: 0.00,
        [CommissionType.ADJUSTMENT]: 0.00,
        [CommissionType.TASK_ASSIGNMENT]: 0.00,
        [CommissionType.TASK_COMPLETION]: 0.00,
        [CommissionType.COLLABORATION_SETUP]: 0.00
      },
      [RecipientType.ENABLER]: {
        [CommissionType.SALE]: 0.00,
        [CommissionType.REFERRAL]: 0.00,
        [CommissionType.BONUS]: 0.00,
        [CommissionType.ADJUSTMENT]: 0.00,
        [CommissionType.TASK_ASSIGNMENT]: 5.00,
        [CommissionType.TASK_COMPLETION]: 10.00,
        [CommissionType.COLLABORATION_SETUP]: 2.00
      },
      [RecipientType.CUSTOMER]: {
        [CommissionType.SALE]: 0.00,
        [CommissionType.REFERRAL]: 0.25,
        [CommissionType.BONUS]: 0.05,
        [CommissionType.ADJUSTMENT]: 0.00,
        [CommissionType.TASK_ASSIGNMENT]: 0.00,
        [CommissionType.TASK_COMPLETION]: 0.00,
        [CommissionType.COLLABORATION_SETUP]: 0.00
      }
    };

    const minAmount = minAmounts[recipientType]?.[type] ?? 0;
    if (amount.toNumber() < minAmount) {
      return {
        allowed: false,
        reason: `Commission amount must be at least $${minAmount} for ${recipientType} ${type}`
      };
    }

    // Maximum commission amounts (anti-fraud)
    const maxAmounts: Record<RecipientType, Record<CommissionType, number>> = {
      [RecipientType.SELLER]: {
        [CommissionType.SALE]: 10000.00,
        [CommissionType.REFERRAL]: 500.00,
        [CommissionType.BONUS]: 1000.00,
        [CommissionType.ADJUSTMENT]: 5000.00,
        [CommissionType.TASK_ASSIGNMENT]: 0.00,
        [CommissionType.TASK_COMPLETION]: 0.00,
        [CommissionType.COLLABORATION_SETUP]: 0.00
      },
      [RecipientType.COURIER]: {
        [CommissionType.SALE]: 0.00,
        [CommissionType.REFERRAL]: 0.00,
        [CommissionType.BONUS]: 0.00,
        [CommissionType.ADJUSTMENT]: 0.00,
        [CommissionType.TASK_ASSIGNMENT]: 0.00,
        [CommissionType.TASK_COMPLETION]: 0.00,
        [CommissionType.COLLABORATION_SETUP]: 0.00
      },
      [RecipientType.ENABLER]: {
        [CommissionType.SALE]: 0.00,
        [CommissionType.REFERRAL]: 0.00,
        [CommissionType.BONUS]: 0.00,
        [CommissionType.ADJUSTMENT]: 0.00,
        [CommissionType.TASK_ASSIGNMENT]: 500.00,
        [CommissionType.TASK_COMPLETION]: 1000.00,
        [CommissionType.COLLABORATION_SETUP]: 100.00
      },
      [RecipientType.CUSTOMER]: {
        [CommissionType.SALE]: 0.00,
        [CommissionType.REFERRAL]: 100.00,
        [CommissionType.BONUS]: 50.00,
        [CommissionType.ADJUSTMENT]: 0.00,
        [CommissionType.TASK_ASSIGNMENT]: 0.00,
        [CommissionType.TASK_COMPLETION]: 0.00,
        [CommissionType.COLLABORATION_SETUP]: 0.00
      }
    };

    const maxAmount = maxAmounts[recipientType]?.[type] ?? 10000.00;
    if (amount.toNumber() > maxAmount) {
      return {
        allowed: false,
        reason: `Commission amount cannot exceed $${maxAmount} for ${recipientType} ${type}`
      };
    }

    return { allowed: true };
  }

  /**
   * Business rules for commission approval
   */
  static canApproveCommission(
    commission: Commission,
    approverRole: string,
    approverId: string
  ): { allowed: boolean; reason?: string } {
    // Only pending commissions can be approved
    if (!commission.isPending()) {
      return { allowed: false, reason: 'Only pending commissions can be approved' };
    }

    // Authorization rules
    const allowedRoles = ['admin', 'finance', 'manager'];
    if (!allowedRoles.includes(approverRole)) {
      return { allowed: false, reason: 'Insufficient permissions to approve commissions' };
    }

    // Large commission approval rules
    if (commission.amount.toNumber() > 1000) {
      if (!['admin', 'finance'].includes(approverRole)) {
        return { allowed: false, reason: 'Large commissions require admin or finance approval' };
      }
    }

    // Cannot approve own commissions (conflict of interest)
    if (commission.sellerId.toString() === approverId) {
      return { allowed: false, reason: 'Cannot approve your own commissions' };
    }

    return { allowed: true };
  }

  /**
   * Business rules for commission rejection
   */
  static canRejectCommission(
    commission: Commission,
    rejectorRole: string,
    rejectorId: string
  ): { allowed: boolean; reason?: string } {
    // Only pending commissions can be rejected
    if (!commission.isPending()) {
      return { allowed: false, reason: 'Only pending commissions can be rejected' };
    }

    // Authorization rules
    const allowedRoles = ['admin', 'finance', 'manager'];
    if (!allowedRoles.includes(rejectorRole)) {
      return { allowed: false, reason: 'Insufficient permissions to reject commissions' };
    }

    return { allowed: true };
  }

  /**
   * Business rules for commission payment
   */
  static canPayCommission(
    commission: Commission,
    paymentMethod: string
  ): { allowed: boolean; reason?: string } {
    // Only approved commissions can be paid
    if (!commission.isPayable()) {
      return { allowed: false, reason: 'Commission must be approved before payment' };
    }

    // Age restrictions (must be at least 24 hours old for fraud prevention)
    if (commission.getAgeInDays() < 1) {
      return { allowed: false, reason: 'Commissions must be at least 24 hours old before payment' };
    }

    // Amount restrictions for certain payment methods
    if (paymentMethod === 'paypal' && commission.amount.toNumber() > 5000) {
      return { allowed: false, reason: 'PayPal payments limited to $5000' };
    }

    return { allowed: true };
  }

  /**
   * Business rules for bulk commission operations
   */
  static canPerformBulkOperation(
    operation: 'approve' | 'reject' | 'pay',
    commissionCount: number,
    operatorRole: string
  ): { allowed: boolean; reason?: string } {
    // Authorization
    const allowedRoles = ['admin', 'finance'];
    if (!allowedRoles.includes(operatorRole)) {
      return { allowed: false, reason: 'Bulk operations require admin or finance role' };
    }

    // Size limits
    const maxSizes: Record<string, number> = {
      'approve': 100,
      'reject': 50,
      'pay': 25
    };

    if (commissionCount > maxSizes[operation]) {
      return {
        allowed: false,
        reason: `Bulk ${operation} limited to ${maxSizes[operation]} commissions at once`
      };
    }

    return { allowed: true };
  }

  /**
   * Business rules for commission adjustments
   */
  static canAdjustCommission(
    commission: Commission,
    adjustmentAmount: CommissionAmount,
    reason: string,
    adjustorRole: string
  ): { allowed: boolean; reason?: string } {
    // Only certain statuses allow adjustments
    if (![CommissionStatus.PENDING, CommissionStatus.APPROVED].includes(commission.status)) {
      return { allowed: false, reason: 'Commission status does not allow adjustments' };
    }

    // Authorization
    if (!['admin', 'finance'].includes(adjustorRole)) {
      return { allowed: false, reason: 'Only admin or finance can adjust commissions' };
    }

    // Adjustment limits
    const maxAdjustment = commission.amount.multiply(0.5); // Max 50% adjustment
    if (adjustmentAmount.toNumber() > maxAdjustment.toNumber()) {
      return { allowed: false, reason: 'Adjustment amount exceeds 50% of commission' };
    }

    // Must provide reason
    if (!reason || reason.trim().length < 10) {
      return { allowed: false, reason: 'Adjustment requires a detailed reason (min 10 characters)' };
    }

    return { allowed: true };
  }

  /**
   * Business rules for commission reporting
   */
  static canViewCommissionReport(
    reportType: 'individual' | 'summary' | 'detailed',
    viewerRole: string,
    targetRecipientId?: string,
    viewerId?: string
  ): { allowed: boolean; reason?: string } {
    // Individual reports - users can view their own
    if (reportType === 'individual') {
      if (targetRecipientId === viewerId) {
        return { allowed: true };
      }
      if (['admin', 'finance', 'manager'].includes(viewerRole)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Can only view your own commission reports' };
    }

    // Summary and detailed reports require elevated permissions
    if (!['admin', 'finance', 'manager'].includes(viewerRole)) {
      return { allowed: false, reason: 'Insufficient permissions for commission reports' };
    }

    return { allowed: true };
  }
}
