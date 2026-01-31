import { Business, BusinessStatus, VerificationStatus, ComplianceStatus } from '../entities/business.entity';

/**
 * Business Scoring Algorithm
 * Pure functions for calculating business trust score, compliance rating, and risk assessment
 */

/**
 * Calculate business trust score (0-100)
 */
export function calculateBusinessTrustScore(business: Business): number {
  let score = 0;

  if (business.verificationStatus === VerificationStatus.VERIFIED) {
    score += 40;
  } else if (business.verificationStatus === VerificationStatus.PENDING_VERIFICATION) {
    score += 20;
  }

  if (business.complianceStatus === ComplianceStatus.COMPLIANT) {
    score += 30;
  } else if (business.complianceStatus === ComplianceStatus.UNDER_REVIEW) {
    score += 15;
  }

  if (business.status === BusinessStatus.ACTIVE) {
    score += 20;
  } else if (business.status === BusinessStatus.PENDING) {
    score += 10;
  }

  if (business.taxId && business.taxId.isValid()) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Calculate compliance rating (0-100)
 */
export function calculateComplianceRating(
  complianceStatus: ComplianceStatus,
  complianceRecordCount: number,
  expiredRecords: number
): number {
  let rating = 0;

  switch (complianceStatus) {
    case ComplianceStatus.COMPLIANT:
      rating = 100;
      break;
    case ComplianceStatus.UNDER_REVIEW:
      rating = 60;
      break;
    case ComplianceStatus.NON_COMPLIANT:
      rating = 20;
      break;
    default:
      rating = 40;
  }

  if (complianceRecordCount > 0 && expiredRecords > 0) {
    const expiryRatio = expiredRecords / complianceRecordCount;
    rating = Math.max(0, Math.floor(rating * (1 - expiryRatio)));
  }

  return Math.min(100, rating);
}

/**
 * Calculate risk assessment score (0-100, higher = more risk)
 */
export function calculateRiskScore(business: Business): number {
  let riskScore = 0;

  if (business.verificationStatus === VerificationStatus.UNVERIFIED) {
    riskScore += 30;
  } else if (business.verificationStatus === VerificationStatus.REJECTED) {
    riskScore += 50;
  }

  if (business.complianceStatus === ComplianceStatus.NON_COMPLIANT) {
    riskScore += 40;
  } else if (business.complianceStatus === ComplianceStatus.UNDER_REVIEW) {
    riskScore += 15;
  }

  if (business.status === BusinessStatus.SUSPENDED) {
    riskScore += 50;
  }

  if (!business.taxId || !business.taxId.isValid()) {
    riskScore += 10;
  }

  return Math.min(100, riskScore);
}
