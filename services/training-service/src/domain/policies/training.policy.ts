import { TrainingRecord } from '../entities/training-record.entity';
import { TrainingModule } from '../entities/training-module.entity';
import { CertificationRequirement } from '../entities/certification-requirement.entity';

/**
 * TrainingPolicy provides allow/deny decisions for training-related actions.
 */
export class TrainingPolicy {
    public canStartTraining(
        courierId: string,
        module: TrainingModule,
        existingRecords: TrainingRecord[],
        requirement: CertificationRequirement,
        completedModuleIds: string[]
    ): { canStart: boolean; reason?: string } {
        // Check prerequisites
        if (!module.validatePrerequisites(completedModuleIds)) {
            return { canStart: false, reason: 'Prerequisites not met' };
        }

        const record = existingRecords.find(r => r.moduleId === module.id);

        // Check attempt limits
        if (record && record.attempts >= requirement.maxAttempts) {
            return { canStart: false, reason: 'Maximum attempts reached' };
        }

        // Check if already in progress
        if (record && record.status === 'IN_PROGRESS') {
            return { canStart: false, reason: 'Training already in progress' };
        }

        return { canStart: true };
    }

    public validateScore(score: number): boolean {
        return score >= 0 && score <= 100;
    }
}
