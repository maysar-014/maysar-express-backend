import { Business, BusinessStatus, VerificationStatus } from '../entities/business.entity';

/**
 * Business Registration Policy
 * Contains business rules for business registration and operations
 */
export class BusinessRegistrationPolicy {
  /**
   * Check if user can register a business
   */
  static canRegister(ownerId: string, existingBusinessCount: number): { allowed: boolean; reason?: string } {
    if (!ownerId || ownerId.trim().length === 0) {
      return { allowed: false, reason: 'Owner ID is required' };
    }

    const maxBusinessesPerOwner = 5;
    if (existingBusinessCount >= maxBusinessesPerOwner) {
      return { allowed: false, reason: `Maximum ${maxBusinessesPerOwner} businesses per owner` };
    }

    return { allowed: true };
  }

  /**
   * Check if business can be verified
   */
  static canVerify(business: Business): { allowed: boolean; reason?: string } {
    if (business.verificationStatus === VerificationStatus.VERIFIED) {
      return { allowed: false, reason: 'Business is already verified' };
    }

    if (business.verificationStatus === VerificationStatus.REJECTED) {
      return { allowed: false, reason: 'Business was rejected and cannot be re-verified without new documents' };
    }

    if (business.status === BusinessStatus.CLOSED) {
      return { allowed: false, reason: 'Cannot verify closed business' };
    }

    return { allowed: true };
  }

  /**
   * Check if business can be suspended
   */
  static canSuspend(business: Business, suspendedBy: string): { allowed: boolean; reason?: string } {
    if (business.status === BusinessStatus.SUSPENDED) {
      return { allowed: false, reason: 'Business is already suspended' };
    }

    if (business.status === BusinessStatus.CLOSED) {
      return { allowed: false, reason: 'Cannot suspend closed business' };
    }

    if (!suspendedBy || suspendedBy.trim().length === 0) {
      return { allowed: false, reason: 'Suspension must be performed by authorized user' };
    }

    return { allowed: true };
  }

  /**
   * Check if business details can be updated
   */
  static canUpdateDetails(business: Business, updatedBy: string): { allowed: boolean; reason?: string } {
    if (business.ownerId !== updatedBy) {
      return { allowed: false, reason: 'Only business owner can update details' };
    }

    if (business.status === BusinessStatus.CLOSED) {
      return { allowed: false, reason: 'Cannot update closed business' };
    }

    if (business.status === BusinessStatus.SUSPENDED) {
      return { allowed: false, reason: 'Cannot update suspended business. Reactivate first.' };
    }

    return { allowed: true };
  }

  /**
   * Check if business can be reactivated
   */
  static canReactivate(business: Business): { allowed: boolean; reason?: string } {
    if (business.status !== BusinessStatus.SUSPENDED) {
      return { allowed: false, reason: 'Only suspended businesses can be reactivated' };
    }

    return { allowed: true };
  }
}
