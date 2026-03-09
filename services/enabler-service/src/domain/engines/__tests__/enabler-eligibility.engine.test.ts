import { EnablerEligibilityEngine, EnablerEligibilityInput } from '../../engines/enabler-eligibility.engine';
import { Enabler_Tier } from '../../types/enabler.types';

describe('EnablerEligibilityEngine', () => {
    const validInput: EnablerEligibilityInput = {
        businessName: 'My Business',
        hasBusinessLicense: true,
        salesExperience: 2, // years
        creditScore: 700,
        monthlyRevenue: 15000,
        yearsInBusiness: 1
    };

    describe('determineEligibility', () => {
        it('should approve eligible applicant', () => {
            const result = EnablerEligibilityEngine.determineEligibility(validInput);
            expect(result.isEligible).toBe(true);
            expect(result.reasons.length).toBeGreaterThan(0);
        });

        it('should reject applicant without business license', () => {
            const result = EnablerEligibilityEngine.determineEligibility({ ...validInput, hasBusinessLicense: false });
            expect(result.isEligible).toBe(false);
            expect(result.requirements).toContain('Valid business license required');
        });

        it('should reject applicant with insufficient experience', () => {
            const result = EnablerEligibilityEngine.determineEligibility({ ...validInput, salesExperience: 0.1 });
            expect(result.isEligible).toBe(false);
            expect(result.requirements.some(r => r.includes('sales experience'))).toBe(true);
        });

        it('should calculate initial tier correctly', () => {
            // High metrics -> Gold
            const goldInput = { ...validInput, salesExperience: 10, creditScore: 800, monthlyRevenue: 200000 };
            const goldResult = EnablerEligibilityEngine.determineEligibility(goldInput);
            expect(goldResult.initialTier).toBe(Enabler_Tier.GOLD);

            // Low metrics -> Bronze
            const bronzeInput = { ...validInput, salesExperience: 1, creditScore: 600, monthlyRevenue: 5000 };
            const bronzeResult = EnablerEligibilityEngine.determineEligibility(bronzeInput);
            expect(bronzeResult.initialTier).toBe(Enabler_Tier.BRONZE);
        });
    });

    describe('meetsMinimumRequirements', () => {
        it('should return true for valid input', () => {
            expect(EnablerEligibilityEngine.meetsMinimumRequirements(validInput)).toBe(true);
        });

        it('should return false for missing name', () => {
            expect(EnablerEligibilityEngine.meetsMinimumRequirements({ ...validInput, businessName: '' })).toBe(false);
        });
    });
});
