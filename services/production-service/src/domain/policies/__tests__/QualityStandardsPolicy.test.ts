import { QualityStandardsPolicy } from '../QualityStandardsPolicy';

describe('QualityStandardsPolicy', () => {
    let policy: QualityStandardsPolicy;

    beforeEach(() => {
        policy = new QualityStandardsPolicy();
    });

    it('should validate quality standards', () => {
        const result = policy.validate({ defectRate: 0.01, compliance: true });
        expect(result.passed).toBe(true);
    });

    it('should reject non-compliant products', () => {
        const result = policy.validate({ defectRate: 0.1, compliance: false });
        expect(result.passed).toBe(false);
    });
});
