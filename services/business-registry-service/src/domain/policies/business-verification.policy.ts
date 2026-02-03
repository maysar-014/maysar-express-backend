import { Business, VerificationStatus } from '../entities/business.entity';

/**
 * Business Verification Policy
 * Contains business rules for verification workflow and document requirements
 */
export class BusinessVerificationPolicy {
  /**
   * Document types required for verification
   */
  static getRequiredDocuments(businessType: string): string[] {
    const baseDocuments = ['REGISTRATION_CERTIFICATE', 'PROOF_OF_ADDRESS', 'OWNER_ID'];
    const additionalDocuments: Record<string, string[]> = {
      CORPORATION: ['TAX_CERTIFICATE', 'BUSINESS_LICENSE'],
      LIMITED_LIABILITY: ['TAX_CERTIFICATE', 'BUSINESS_LICENSE'],
      PARTNERSHIP: ['TAX_CERTIFICATE'],
      SOLE_PROPRIETORSHIP: []
    };
    return [...baseDocuments, ...(additionalDocuments[businessType] ?? [])];
  }

  /**
   * Check if all required documents are provided
   */
  static hasRequiredDocuments(
    providedDocumentTypes: string[],
    businessType: string
  ): { satisfied: boolean; missing: string[] } {
    const required = this.getRequiredDocuments(businessType);
    const provided = new Set(providedDocumentTypes.map(d => d.toUpperCase()));
    const missing = required.filter(doc => !provided.has(doc));
    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  /**
   * Check if business is eligible for verification workflow
   */
  static isEligibleForVerification(business: Business): { eligible: boolean; reason?: string } {
    if (business.verificationStatus === VerificationStatus.VERIFIED) {
      return { eligible: false, reason: 'Already verified' };
    }

    if (business.verificationStatus === VerificationStatus.PENDING_VERIFICATION) {
      return { eligible: false, reason: 'Verification already in progress' };
    }

    return { eligible: true };
  }

  /**
   * Check if business can be verified (alias for isEligibleForVerification)
   * Returns allowed/reason format for use case compatibility
   */
  static canVerify(business: Business): { allowed: boolean; reason?: string } {
    const eligibility = this.isEligibleForVerification(business);
    return {
      allowed: eligibility.eligible,
      reason: eligibility.reason
    };
  }

  /**
   * Compliance check requirements for verification
   */
  static getComplianceRequirements(businessType: string): string[] {
    const baseRequirements = ['TAX_COMPLIANCE', 'BUSINESS_LICENSE'];
    const additionalRequirements: Record<string, string[]> = {
      CORPORATION: ['HEALTH_PERMIT', 'ENVIRONMENTAL_CLEARANCE'],
      LIMITED_LIABILITY: ['HEALTH_PERMIT'],
      PARTNERSHIP: [],
      SOLE_PROPRIETORSHIP: []
    };
    return [...baseRequirements, ...(additionalRequirements[businessType] ?? [])];
  }
}
