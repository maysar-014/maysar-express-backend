import { ExpertiseValidationPolicy } from '../expertise-validation.policy';

describe('ExpertiseValidationPolicy', () => {
    let policy: ExpertiseValidationPolicy;

    beforeEach(() => {
        policy = new ExpertiseValidationPolicy();
    });

    it('should validate expertise', () => {
        const result = policy.validate({ userId: 'u1', domain: 'farming', experience: 5 });
        expect(result.isValid).toBe(true);
    });

    it('should reject invalid expertise', () => {
        const result = policy.validate({ userId: 'u1', domain: 'farming', experience: 0 });
        expect(result.isValid).toBe(false);
    });
});
