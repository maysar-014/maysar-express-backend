import { Business } from '../business.entity';
import { BusinessId } from '../../value-objects/business-id.value-object';
import { RegistrationNumber } from '../../value-objects/registration-number.value-object';
import { TaxId } from '../../value-objects/tax-id.value-object';
import { BusinessStatus, VerificationStatus, ComplianceStatus, BusinessType } from '../../types/business.types';

describe('Business Entity', () => {
  const registrationNumber = RegistrationNumber.create('TZ-DAR-12345');
  const taxId = TaxId.create('123456789');
  const ownerId = 'user-123';

  describe('register', () => {
    it('should create a new business with PENDING status', () => {
      const business = Business.register({
        id: BusinessId.create().getValue(),
        name: 'Test Business',
        businessType: BusinessType.SOLE_PROPRIETORSHIP,
        registrationNumber,
        ownerId
      });

      expect(business.status).toBe(BusinessStatus.PENDING);
      expect(business.verificationStatus).toBe(VerificationStatus.UNVERIFIED);
      expect(business.complianceStatus).toBe(ComplianceStatus.UNDER_REVIEW);
      expect(business.name).toBe('Test Business');
      expect(business.ownerId).toBe(ownerId);
    });
  });

  describe('verify', () => {
    it('should update verification status and set verifiedAt', () => {
      const business = Business.register({
        id: BusinessId.create().getValue(),
        name: 'Test Business',
        businessType: BusinessType.SOLE_PROPRIETORSHIP,
        registrationNumber,
        ownerId
      });

      const verified = business.verify('admin-1');

      expect(verified.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(verified.verifiedBy).toBe('admin-1');
      expect(verified.verifiedAt).toBeDefined();
      expect(verified.status).toBe(BusinessStatus.ACTIVE);
    });
  });

  describe('suspend', () => {
    it('should update status to SUSPENDED', () => {
      const business = Business.register({
        id: BusinessId.create().getValue(),
        name: 'Test Business',
        businessType: BusinessType.SOLE_PROPRIETORSHIP,
        registrationNumber,
        ownerId
      });

      const suspended = business.suspend();

      expect(suspended.status).toBe(BusinessStatus.SUSPENDED);
    });
  });

  describe('reactivate', () => {
    it('should update status from SUSPENDED to ACTIVE', () => {
      const business = Business.register({
        id: BusinessId.create().getValue(),
        name: 'Test Business',
        businessType: BusinessType.SOLE_PROPRIETORSHIP,
        registrationNumber,
        ownerId
      });
      const suspended = business.suspend();
      const reactivated = suspended.reactivate();

      expect(reactivated.status).toBe(BusinessStatus.ACTIVE);
    });
  });

  describe('validate', () => {
    it('should return valid for correct business', () => {
      const business = Business.register({
        id: BusinessId.create().getValue(),
        name: 'Test Business',
        businessType: BusinessType.SOLE_PROPRIETORSHIP,
        registrationNumber,
        ownerId
      });

      const result = business.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid business', () => {
      const business = new Business({
        id: '',
        name: '',
        businessType: BusinessType.SOLE_PROPRIETORSHIP,
        registrationNumber,
        ownerId: '',
        status: BusinessStatus.PENDING,
        verificationStatus: VerificationStatus.UNVERIFIED,
        complianceStatus: ComplianceStatus.UNDER_REVIEW,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = business.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('canOperate', () => {
    it('should return true for active verified compliant business', () => {
      const business = Business.register({
        id: BusinessId.create().getValue(),
        name: 'Test Business',
        businessType: BusinessType.SOLE_PROPRIETORSHIP,
        registrationNumber,
        ownerId
      });
      const verified = business.verify('admin-1');

      expect(verified.canOperate()).toBe(true);
    });
  });
});
