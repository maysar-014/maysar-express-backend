/**
 * Business Domain Types
 * TypeScript types for the Business Registry Service domain
 */

/**
 * Business types in the system
 */
export enum BusinessType {
  SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP',
  PARTNERSHIP = 'PARTNERSHIP',
  LIMITED_LIABILITY = 'LIMITED_LIABILITY',
  CORPORATION = 'CORPORATION'
}

/**
 * Business status in the system
 */
export enum BusinessStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
  CLOSED = 'CLOSED'
}

/**
 * Verification status for businesses
 */
export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

/**
 * Compliance status for businesses
 */
export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  UNDER_REVIEW = 'UNDER_REVIEW'
}

/**
 * Address type for business addresses
 */
export enum AddressType {
  MAIN = 'MAIN',
  BRANCH = 'BRANCH',
  WAREHOUSE = 'WAREHOUSE',
  OTHER = 'OTHER'
}
