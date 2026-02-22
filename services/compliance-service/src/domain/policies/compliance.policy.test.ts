import { CompliancePolicy } from '../compliance.policy';

describe('CompliancePolicy', () => {
  describe('validateKYC', () => {
    it('should pass valid KYC', () => {
      const result = CompliancePolicy.validateKYC({
        name: 'John Doe',
        idNumber: '123456',
        verified: true
      });
      expect(result.valid).toBe(true);
    });

    it('should reject unverified KYC', () => {
      const result = CompliancePolicy.validateKYC({
        name: 'John Doe',
        idNumber: '123456',
        verified: false
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('checkAMLCompliance', () => {
    it('should pass clean record', () => {
      const result = CompliancePolicy.checkAMLCompliance({
        userId: 'u1',
        transactionAmount: 1000,
        riskScore: 0.2
      });
      expect(result.compliant).toBe(true);
    });

    it('should flag high risk', () => {
      const result = CompliancePolicy.checkAMLCompliance({
        userId: 'u1',
        transactionAmount: 50000,
        riskScore: 0.9
      });
      expect(result.compliant).toBe(false);
    });
  });
});
