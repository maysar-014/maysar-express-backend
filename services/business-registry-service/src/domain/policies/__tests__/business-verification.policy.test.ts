import { BusinessVerificationPolicy } from '../business-verification.policy';
import { Business } from '../../entities/business.entity';
import { RegistrationNumber } from '../../value-objects/registration-number.value-object';
import { BusinessStatus, VerificationStatus, ComplianceStatus, BusinessType } from '../../types/business.types';

describe('BusinessVerificationPolicy', () => {
  const createBusiness = (overrides = {}) =>
    new Business({
      id: 'biz-1',
      name: 'Test Business',
      businessType: BusinessType.SOLE_PROPRIETORSHIP,
      registrationNumber: RegistrationNumber.create('TZ-DAR-12345'),
      ownerId: 'owner-1',
      status: BusinessStatus.ACTIVE,
      verificationStatus: VerificationStatus.UNVERIFIED,
      complianceStatus: ComplianceStatus.COMPLIANT,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    });

  describe('canVerify', () => {
    it('should allow verification for unverified business', () => {
      const business = createBusiness({ verificationStatus: VerificationStatus.UNVERIFIED });
      const result = BusinessVerificationPolicy.canVerify(business);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject verification for already verified business', () => {
      const business = createBusiness({ verificationStatus: VerificationStatus.VERIFIED });
      const result = BusinessVerificationPolicy.canVerify(business);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Already verified');
    });

    it('should reject verification for business with pending verification', () => {
      const business = createBusiness({ verificationStatus: VerificationStatus.PENDING_VERIFICATION });
      const result = BusinessVerificationPolicy.canVerify(business);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Verification already in progress');
    });
  });

  describe('isEligibleForVerification', () => {
    it('should return eligible for unverified business', () => {
      const business = createBusiness({ verificationStatus: VerificationStatus.UNVERIFIED });
      const result = BusinessVerificationPolicy.isEligibleForVerification(business);
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return not eligible for already verified business', () => {
      const business = createBusiness({ verificationStatus: VerificationStatus.VERIFIED });
      const result = BusinessVerificationPolicy.isEligibleForVerification(business);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Already verified');
    });

    it('should return not eligible for business with pending verification', () => {
      const business = createBusiness({ verificationStatus: VerificationStatus.PENDING_VERIFICATION });
      const result = BusinessVerificationPolicy.isEligibleForVerification(business);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Verification already in progress');
    });
  });

  describe('getRequiredDocuments', () => {
    it('should return base documents for sole proprietorship', () => {
      const docs = BusinessVerificationPolicy.getRequiredDocuments(BusinessType.SOLE_PROPRIETORSHIP);
      expect(docs).toContain('REGISTRATION_CERTIFICATE');
      expect(docs).toContain('PROOF_OF_ADDRESS');
      expect(docs).toContain('OWNER_ID');
      expect(docs).not.toContain('TAX_CERTIFICATE');
    });

    it('should return base + tax documents for partnership', () => {
      const docs = BusinessVerificationPolicy.getRequiredDocuments(BusinessType.PARTNERSHIP);
      expect(docs).toContain('REGISTRATION_CERTIFICATE');
      expect(docs).toContain('PROOF_OF_ADDRESS');
      expect(docs).toContain('OWNER_ID');
      expect(docs).toContain('TAX_CERTIFICATE');
    });

    it('should return all documents for corporation', () => {
      const docs = BusinessVerificationPolicy.getRequiredDocuments(BusinessType.CORPORATION);
      expect(docs).toContain('REGISTRATION_CERTIFICATE');
      expect(docs).toContain('PROOF_OF_ADDRESS');
      expect(docs).toContain('OWNER_ID');
      expect(docs).toContain('TAX_CERTIFICATE');
      expect(docs).toContain('BUSINESS_LICENSE');
    });

    it('should return all documents for limited liability', () => {
      const docs = BusinessVerificationPolicy.getRequiredDocuments(BusinessType.LIMITED_LIABILITY);
      expect(docs).toContain('REGISTRATION_CERTIFICATE');
      expect(docs).toContain('PROOF_OF_ADDRESS');
      expect(docs).toContain('OWNER_ID');
      expect(docs).toContain('TAX_CERTIFICATE');
      expect(docs).toContain('BUSINESS_LICENSE');
    });
  });

  describe('hasRequiredDocuments', () => {
    it('should return satisfied when all documents provided', () => {
      const providedDocs = ['REGISTRATION_CERTIFICATE', 'PROOF_OF_ADDRESS', 'OWNER_ID'];
      const result = BusinessVerificationPolicy.hasRequiredDocuments(
        providedDocs,
        BusinessType.SOLE_PROPRIETORSHIP
      );
      expect(result.satisfied).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return not satisfied when documents missing', () => {
      const providedDocs = ['REGISTRATION_CERTIFICATE'];
      const result = BusinessVerificationPolicy.hasRequiredDocuments(
        providedDocs,
        BusinessType.SOLE_PROPRIETORSHIP
      );
      expect(result.satisfied).toBe(false);
      expect(result.missing).toContain('PROOF_OF_ADDRESS');
      expect(result.missing).toContain('OWNER_ID');
    });

    it('should handle case-insensitive document types', () => {
      const providedDocs = ['registration_certificate', 'proof_of_address', 'owner_id'];
      const result = BusinessVerificationPolicy.hasRequiredDocuments(
        providedDocs,
        BusinessType.SOLE_PROPRIETORSHIP
      );
      expect(result.satisfied).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should check additional documents for corporation', () => {
      const providedDocs = ['REGISTRATION_CERTIFICATE', 'PROOF_OF_ADDRESS', 'OWNER_ID'];
      const result = BusinessVerificationPolicy.hasRequiredDocuments(
        providedDocs,
        BusinessType.CORPORATION
      );
      expect(result.satisfied).toBe(false);
      expect(result.missing).toContain('TAX_CERTIFICATE');
      expect(result.missing).toContain('BUSINESS_LICENSE');
    });
  });

  describe('getComplianceRequirements', () => {
    it('should return base requirements for sole proprietorship', () => {
      const reqs = BusinessVerificationPolicy.getComplianceRequirements(BusinessType.SOLE_PROPRIETORSHIP);
      expect(reqs).toContain('TAX_COMPLIANCE');
      expect(reqs).toContain('BUSINESS_LICENSE');
      expect(reqs).not.toContain('HEALTH_PERMIT');
    });

    it('should return additional requirements for corporation', () => {
      const reqs = BusinessVerificationPolicy.getComplianceRequirements(BusinessType.CORPORATION);
      expect(reqs).toContain('TAX_COMPLIANCE');
      expect(reqs).toContain('BUSINESS_LICENSE');
      expect(reqs).toContain('HEALTH_PERMIT');
      expect(reqs).toContain('ENVIRONMENTAL_CLEARANCE');
    });

    it('should return health permit for limited liability', () => {
      const reqs = BusinessVerificationPolicy.getComplianceRequirements(BusinessType.LIMITED_LIABILITY);
      expect(reqs).toContain('TAX_COMPLIANCE');
      expect(reqs).toContain('BUSINESS_LICENSE');
      expect(reqs).toContain('HEALTH_PERMIT');
      expect(reqs).not.toContain('ENVIRONMENTAL_CLEARANCE');
    });
  });
});