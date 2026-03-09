import {
  BusinessType,
  BusinessStatus,
  VerificationStatus,
  ComplianceStatus,
  AddressType
} from './business.types';

describe('business.types', () => {
  it('exposes canonical business type enums', () => {
    expect(BusinessType.SOLE_PROPRIETORSHIP).toBe('SOLE_PROPRIETORSHIP');
    expect(BusinessType.PARTNERSHIP).toBe('PARTNERSHIP');
    expect(BusinessType.LIMITED_LIABILITY).toBe('LIMITED_LIABILITY');
    expect(BusinessType.CORPORATION).toBe('CORPORATION');
  });

  it('exposes business lifecycle and verification/compliance enums', () => {
    expect(BusinessStatus.PENDING).toBe('PENDING');
    expect(BusinessStatus.ACTIVE).toBe('ACTIVE');
    expect(BusinessStatus.SUSPENDED).toBe('SUSPENDED');
    expect(BusinessStatus.DEACTIVATED).toBe('DEACTIVATED');
    expect(BusinessStatus.CLOSED).toBe('CLOSED');

    expect(VerificationStatus.UNVERIFIED).toBe('UNVERIFIED');
    expect(VerificationStatus.PENDING_VERIFICATION).toBe('PENDING_VERIFICATION');
    expect(VerificationStatus.VERIFIED).toBe('VERIFIED');
    expect(VerificationStatus.REJECTED).toBe('REJECTED');

    expect(ComplianceStatus.COMPLIANT).toBe('COMPLIANT');
    expect(ComplianceStatus.NON_COMPLIANT).toBe('NON_COMPLIANT');
    expect(ComplianceStatus.UNDER_REVIEW).toBe('UNDER_REVIEW');
  });

  it('exposes supported address types', () => {
    expect(AddressType.MAIN).toBe('MAIN');
    expect(AddressType.BRANCH).toBe('BRANCH');
    expect(AddressType.WAREHOUSE).toBe('WAREHOUSE');
    expect(AddressType.OTHER).toBe('OTHER');
  });
});
