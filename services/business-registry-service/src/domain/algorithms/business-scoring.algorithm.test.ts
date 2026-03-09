import {
  calculateBusinessTrustScore,
  calculateComplianceRating,
  calculateRiskScore
} from './business-scoring.algorithm';
import { BusinessStatus, VerificationStatus, ComplianceStatus } from '../entities/business.entity';

type BusinessLike = {
  verificationStatus: VerificationStatus;
  complianceStatus: ComplianceStatus;
  status: BusinessStatus;
  taxId?: { isValid: () => boolean };
};

const createBusiness = (overrides: Partial<BusinessLike> = {}): BusinessLike => ({
  verificationStatus: VerificationStatus.VERIFIED,
  complianceStatus: ComplianceStatus.COMPLIANT,
  status: BusinessStatus.ACTIVE,
  taxId: { isValid: () => true },
  ...overrides
});

describe('business-scoring.algorithm', () => {
  it('calculates trust score across verified/compliant/active dimensions', () => {
    const topTrust = calculateBusinessTrustScore(createBusiness() as never);
    const midTrust = calculateBusinessTrustScore(
      createBusiness({
        verificationStatus: VerificationStatus.PENDING_VERIFICATION,
        complianceStatus: ComplianceStatus.UNDER_REVIEW,
        status: BusinessStatus.PENDING,
        taxId: undefined
      }) as never
    );

    expect(topTrust).toBe(100);
    expect(midTrust).toBe(45);
  });

  it('calculates compliance rating with expiry penalties and default fallback', () => {
    const compliant = calculateComplianceRating(ComplianceStatus.COMPLIANT, 10, 0);
    const withExpiryPenalty = calculateComplianceRating(ComplianceStatus.COMPLIANT, 10, 2);
    const defaultCase = calculateComplianceRating('UNKNOWN' as unknown as ComplianceStatus, 0, 0);

    expect(compliant).toBe(100);
    expect(withExpiryPenalty).toBe(80);
    expect(defaultCase).toBe(40);
  });

  it('calculates bounded risk score for high-risk and low-risk businesses', () => {
    const highRisk = calculateRiskScore(
      createBusiness({
        verificationStatus: VerificationStatus.REJECTED,
        complianceStatus: ComplianceStatus.NON_COMPLIANT,
        status: BusinessStatus.SUSPENDED,
        taxId: undefined
      }) as never
    );

    const lowRisk = calculateRiskScore(
      createBusiness({
        verificationStatus: VerificationStatus.VERIFIED,
        complianceStatus: ComplianceStatus.COMPLIANT,
        status: BusinessStatus.ACTIVE,
        taxId: { isValid: () => true }
      }) as never
    );

    expect(highRisk).toBe(100);
    expect(lowRisk).toBe(0);
  });
});
