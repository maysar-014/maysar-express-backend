import { FraudPreventionPolicy, FraudActionDecision } from '../fraud-prevention.policy';

describe('Fraud Prevention Policy', () => {
    let policy: FraudPreventionPolicy;

    beforeEach(() => {
        policy = new FraudPreventionPolicy();
    });

    describe('Action Determination', () => {
        it('should low risk -> approve', () => {
            const decision = policy.getActionForRiskLevel('low', 10);
            expect(decision.action).toBe('approve');
            expect(decision.requiresManualReview).toBe(false);
        });

        it('should medium risk -> review', () => {
            const decision = policy.getActionForRiskLevel('medium', 65);
            expect(decision.action).toBe('review');
            expect(decision.requiresManualReview).toBe(true);
        });

        it('should high risk -> decline', () => {
            const decision = policy.getActionForRiskLevel('high', 85);
            expect(decision.action).toBe('decline');
            expect(decision.autoDecline).toBe(true);
        });

        it('should critical risk -> block', () => {
            const decision = policy.getActionForRiskLevel('critical', 96);
            expect(decision.action).toBe('block');
            expect(decision.blockUser).toBe(true);
        });
    });

    describe('Auto Decline', () => {
        it('should auto decline if score >= 85', () => {
            expect(policy.shouldAutoDecline(85, [])).toBe(true);
        });

        it('should auto decline if critical flag present', () => {
            expect(policy.shouldAutoDecline(50, ['impossible_travel'])).toBe(true);
        });

        it('should not auto decline safe transaction', () => {
            expect(policy.shouldAutoDecline(50, [])).toBe(false);
        });
    });

    describe('Verification Requirements', () => {
        it('should require nothing for low risk', () => {
            expect(policy.getVerificationRequirements(10)).toHaveLength(0);
        });

        it('should require phone for medium risk', () => {
            const reqs = policy.getVerificationRequirements(60);
            expect(reqs).toContain('phone_verification');
        });

        it('should require docs for critical risk', () => {
            const reqs = policy.getVerificationRequirements(90);
            expect(reqs).toContain('document_upload');
        });
    });
});
