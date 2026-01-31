import { BusinessRegistrationPolicy } from '../business-registration.policy';
import { Business } from '../../entities/business.entity';
import { RegistrationNumber } from '../../value-objects/registration-number.value-object';
import { BusinessStatus, VerificationStatus, ComplianceStatus, BusinessType } from '../../types/business.types';

describe('BusinessRegistrationPolicy', () => {
  const createBusiness = (overrides = {}) =>
    new Business({
      id: 'biz-1',
      name: 'Test Business',
      businessType: BusinessType.SOLE_PROPRIETORSHIP,
      registrationNumber: RegistrationNumber.create('TZ-DAR-12345'),
      ownerId: 'owner-1',
      status: BusinessStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      complianceStatus: ComplianceStatus.COMPLIANT,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    });

  describe('canRegister', () => {
    it('should allow registration when under limit', () => {
      const result = BusinessRegistrationPolicy.canRegister('owner-1', 2);
      expect(result.allowed).toBe(true);
    });

    it('should reject when at max businesses', () => {
      const result = BusinessRegistrationPolicy.canRegister('owner-1', 5);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum');
    });
  });

  describe('canVerify', () => {
    it('should allow verification for unverified business', () => {
      const business = createBusiness({ verificationStatus: VerificationStatus.UNVERIFIED });
      const result = BusinessRegistrationPolicy.canVerify(business);
      expect(result.allowed).toBe(true);
    });

    it('should reject for already verified business', () => {
      const business = createBusiness();
      const result = BusinessRegistrationPolicy.canVerify(business);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canSuspend', () => {
    it('should allow suspension for active business', () => {
      const business = createBusiness();
      const result = BusinessRegistrationPolicy.canSuspend(business, 'admin-1');
      expect(result.allowed).toBe(true);
    });

    it('should reject for already suspended business', () => {
      const business = createBusiness({ status: BusinessStatus.SUSPENDED });
      const result = BusinessRegistrationPolicy.canSuspend(business, 'admin-1');
      expect(result.allowed).toBe(false);
    });
  });

  describe('canUpdateDetails', () => {
    it('should allow owner to update', () => {
      const business = createBusiness();
      const result = BusinessRegistrationPolicy.canUpdateDetails(business, 'owner-1');
      expect(result.allowed).toBe(true);
    });

    it('should reject non-owner update', () => {
      const business = createBusiness();
      const result = BusinessRegistrationPolicy.canUpdateDetails(business, 'other-user');
      expect(result.allowed).toBe(false);
    });
  });
});
