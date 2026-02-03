import { EligibilityEngine } from '../eligibility.engine';
import { TrainingRecord } from '../../entities/training-record.entity';
import { CertificationRequirement } from '../../entities/certification-requirement.entity';
import { TrainingStatus } from '../../value-objects/training-status.value-object';

describe('EligibilityEngine', () => {
    let engine: EligibilityEngine;

    beforeEach(() => {
        engine = new EligibilityEngine();
    });

    it('should return eligible true if all mandatory requirements are met', () => {
        const requirements = [
            CertificationRequirement.create({
                module: 'safety',
                minimumScore: 80,
                validityPeriodDays: 365,
                mandatory: true,
                maxAttempts: 3
            })
        ];

        const records = [
            TrainingRecord.create({
                id: '1',
                learnerId: 'u1',
                learnerRole: 'courier',
                moduleId: 'safety',
                status: TrainingStatus.COMPLETED,
                attempts: 1,
                expiresAt: new Date(Date.now() + 100000)
            })
        ];

        const result = engine.checkEligibility(records, requirements);
        expect(result.eligible).toBe(true);
        expect(result.missingRequirements).toHaveLength(0);
    });

    it('should return eligible false if a mandatory requirement is missing', () => {
        const requirements = [
            CertificationRequirement.create({
                module: 'safety',
                minimumScore: 80,
                validityPeriodDays: 365,
                mandatory: true,
                maxAttempts: 3
            })
        ];

        const records: TrainingRecord[] = [];

        const result = engine.checkEligibility(records, requirements);
        expect(result.eligible).toBe(false);
        expect(result.missingRequirements).toContain('safety');
    });

    it('should return eligible false if a mandatory training is expired', () => {
        const requirements = [
            CertificationRequirement.create({
                module: 'safety',
                minimumScore: 80,
                validityPeriodDays: 365,
                mandatory: true,
                maxAttempts: 3
            })
        ];

        const records = [
            TrainingRecord.create({
                id: '1',
                learnerId: 'u1',
                learnerRole: 'courier',
                moduleId: 'safety',
                status: TrainingStatus.COMPLETED,
                attempts: 1,
                expiresAt: new Date(Date.now() - 100000) // Expired
            })
        ];

        const result = engine.checkEligibility(records, requirements);
        expect(result.eligible).toBe(false);
        expect(result.missingRequirements).toContain('safety');
    });
});
