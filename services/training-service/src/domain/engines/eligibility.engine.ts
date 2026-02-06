import { TrainingRecord } from '../entities/training-record.entity';
import { TrainingModule } from '../entities/training-module.entity';
import { CertificationRequirement } from '../entities/certification-requirement.entity';
import { TrainingStatus } from '../value-objects/training-status.value-object';

export interface EligibilityStatus {
    eligible: boolean;
    completionPercentage: number;
    missingRequirements: string[];
    completedModules: string[];
    inProgressModules: string[];
}

/**
 * EligibilityEngine provides informational status about learner progress.
 * It does NOT enforce restrictions - eligibility is informational only.
 */
export class EligibilityEngine {
    /**
     * Check learner eligibility status (informational, not restrictive)
     */
    public checkEligibility(
        trainingRecords: TrainingRecord[],
        requirements: CertificationRequirement[]
    ): EligibilityStatus {
        const mandatoryRequirements = requirements.filter(req => req.mandatory);
        const missingRequirements: string[] = [];
        const completedModules: string[] = [];
        const inProgressModules: string[] = [];

        for (const requirement of mandatoryRequirements) {
            const record = trainingRecords.find(r => r.moduleId === requirement.module);

            if (!record ||
                record.status !== TrainingStatus.COMPLETED ||
                record.isExpired()) {
                missingRequirements.push(requirement.module);
            } else {
                completedModules.push(requirement.module);
            }

            if (record && record.status === TrainingStatus.IN_PROGRESS) {
                inProgressModules.push(requirement.module);
            }
        }

        const completionPercentage = mandatoryRequirements.length > 0
            ? (completedModules.length / mandatoryRequirements.length) * 100
            : 100;

        return {
            eligible: missingRequirements.length === 0,
            completionPercentage: Math.round(completionPercentage),
            missingRequirements,
            completedModules,
            inProgressModules
        };
    }

    public getMissingRequirements(
        trainingRecords: TrainingRecord[],
        requirements: CertificationRequirement[]
    ): string[] {
        return this.checkEligibility(trainingRecords, requirements).missingRequirements;
    }

    /**
     * Get recommended modules based on learner's completed modules
     */
    public getRecommendedModules(
        learnerId: string,
        completedModuleIds: string[],
        allModules: TrainingModule[],
        learnerRole?: string
    ): TrainingModule[] {
        const recommendations: TrainingModule[] = [];

        for (const module of allModules) {
            // Skip already completed modules
            if (completedModuleIds.includes(module.id)) {
                continue;
            }

            // Prioritize modules targeted for learner's role
            if (learnerRole && module.isTargetedForRole(learnerRole)) {
                recommendations.push(module);
                continue;
            }

            // Include public modules with met prerequisites
            if (module.isPublic && module.validatePrerequisites(completedModuleIds)) {
                recommendations.push(module);
            }
        }

        return recommendations;
    }

    /**
     * Calculate completion percentage for a learner
     */
    public getCompletionPercentage(
        trainingRecords: TrainingRecord[],
        totalModules: number
    ): number {
        const completedCount = trainingRecords.filter(
            r => r.status === TrainingStatus.COMPLETED && !r.isExpired()
        ).length;

        return totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
    }
}

