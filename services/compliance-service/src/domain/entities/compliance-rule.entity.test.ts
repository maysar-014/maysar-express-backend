import { ComplianceRule } from '../compliance-rule.entity';

describe('ComplianceRule Entity', () => {
  it('should create valid rule', () => {
    const rule = ComplianceRule.create({
      id: 'r1',
      name: 'KYC Verification',
      type: 'kyc',
      severity: 'high',
      enabled: true
    });
    expect(rule.getId()).toBe('r1');
    expect(rule.isEnabled()).toBe(true);
  });

  it('should validate rule execution', () => {
    const rule = ComplianceRule.create({
      id: 'r1',
      name: 'Age Verification',
      type: 'age',
      severity: 'medium',
      enabled: true
    });
    const result = rule.validate({ age: 25 });
    expect(result.passed).toBe(true);
  });

  it('should reject invalid data', () => {
    const rule = ComplianceRule.create({
      id: 'r1',
      name: 'Age Verification',
      type: 'age',
      severity: 'medium',
      enabled: true
    });
    const result = rule.validate({ age: 15 });
    expect(result.passed).toBe(false);
  });
});
