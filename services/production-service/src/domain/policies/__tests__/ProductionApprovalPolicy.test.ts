import { ProductionApprovalPolicy } from '../ProductionApprovalPolicy';

describe('ProductionApprovalPolicy', () => {
    let policy: ProductionApprovalPolicy;

    beforeEach(() => {
        policy = new ProductionApprovalPolicy();
    });

    it('should approve valid production', () => {
        const result = policy.canApprove({ qualityPassed: true, resourcesAvailable: true });
        expect(result).toBe(true);
    });

    it('should reject invalid production', () => {
        const result = policy.canApprove({ qualityPassed: false, resourcesAvailable: true });
        expect(result).toBe(false);
    });
});
