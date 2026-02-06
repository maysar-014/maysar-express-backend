import { TrainingRecord } from '../entities/training-record.entity';
import { TrainingModule } from '../entities/training-module.entity';
import { CertificationRequirement } from '../entities/certification-requirement.entity';

export interface TrainingAccessResult {
    canStart: boolean;
    warnings?: string[];
    recommendations?: string[];
}

/**
 * TrainingPolicy provides informational guidance for training-related actions.
 * It does NOT enforce hard restrictions - all authenticated users can access training.
 */
export class TrainingPolicy {
    /**
     * Checks if a learner can start training (informational, not restrictive)
     * @returns Enhanced response with warnings and recommendations
     */
    public canStartTraining(
        learnerId: string,
        learnerRole: string,
        module: TrainingModule,
        existingRecords: TrainingRecord[],
        requirement: CertificationRequirement,
        completedModuleIds: string[]
    ): TrainingAccessResult {
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // Check if module is targeted for this role (informational only)
        if (!module.isTargetedForRole(learnerRole)) {
            recommendations.push(`This module is primarily designed for other roles, but you're welcome to take it.`);
        }

        // Check prerequisites (soft recommendation, not blocking)
        const missingPrereqs = module.getMissingPrerequisites(completedModuleIds);
        if (missingPrereqs.length > 0) {
            recommendations.push(`For better understanding, consider completing these modules first: ${missingPrereqs.join(', ')}`);
        }

        const record = existingRecords.find(r => r.moduleId === module.id);

        // Check attempt limits (configurable suggestion, not hard block)
        if (record && record.attempts >= requirement.maxAttempts) {
            warnings.push(`You've reached the suggested maximum attempts (${requirement.maxAttempts}). Consider reviewing the material before retrying.`);
        }

        // Check if already in progress
        if (record && record.status === 'IN_PROGRESS') {
            warnings.push('You have an in-progress session for this module. Starting again will create a new attempt.');
        }

        // Check if already completed
        if (record && record.status === 'COMPLETED' && !record.isExpired()) {
            recommendations.push('You have already completed this module. Retaking it will update your score.');
        }

        return {
            canStart: true, // Always true - training is accessible to all
            warnings: warnings.length > 0 ? warnings : undefined,
            recommendations: recommendations.length > 0 ? recommendations : undefined
        };
    }

    /**
     * Simple check if user can access training (only checks user existence)
     */
    public canAccessTraining(userId: string): boolean {
        // Simply check if user exists (authentication check)
        return !!userId && userId.length > 0;
    }

    public validateScore(score: number): boolean {
        return score >= 0 && score <= 100;
    }
}

