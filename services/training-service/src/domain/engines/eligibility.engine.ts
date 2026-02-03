import { TrainingRecord } from '../entities/training-record.entity';
import { CertificationRequirement } from '../entities/certification-requirement.entity';
import { TrainingStatus } from '../value-objects/training-status.value-object';

/**
 * EligibilityEngine orchestrates algorithms and policies to determine courier delivery eligibility.
 */
export class EligibilityEngine {
    public checkEligibility(
        trainingRecords: TrainingRecord[],
        requirements: CertificationRequirement[]
    ): { eligible: boolean; missingRequirements: string[] } {
        const mandatoryRequirements = requirements.filter(req => req.mandatory);
        const missingRequirements: string[] = [];

        for (const requirement of mandatoryRequirements) {
            const record = trainingRecords.find(r => r.moduleId === requirement.module);

            if (!record ||
                record.status !== TrainingStatus.COMPLETED ||
                record.isExpired()) {
                missingRequirements.push(requirement.module);
            }
        }

        return {
            eligible: missingRequirements.length === 0,
            missingRequirements
        };
    }

    public getMissingRequirements(
        trainingRecords: TrainingRecord[],
        requirements: CertificationRequirement[]
    ): string[] {
        return this.checkEligibility(trainingRecords, requirements).missingRequirements;
    }
}
