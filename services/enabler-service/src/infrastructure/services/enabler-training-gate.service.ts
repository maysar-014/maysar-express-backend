import prisma from '../database/prisma-client';

/**
 * Server-side training gate for enabler activation (§6).
 *
 * Training truth lives in the shared training domain (`training_training_records`
 * + `training_certification_requirements`) — the Enabler domain only *reads* it
 * and mirrors the outcome onto the enabler profile. A client can never assert
 * that training is complete (§47).
 *
 * Semantics are aligned with the training service's own eligibility engine: a
 * module qualifies only when its record is COMPLETED and not expired.
 */

/** Enabler-side mirror of the training domain status (lowercase convention). */
export type MirroredTrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired';

export interface EnablerTrainingRequirement {
    /** True when at least one mandatory certification requirement exists. */
    trainingRequired: boolean;
    /** Requirement satisfied (or nothing required at all). */
    satisfied: boolean;
    mirroredStatus: MirroredTrainingStatus;
    completedAt: Date | null;
    mandatoryModules: string[];
    missingModules: string[];
}

const toMirroredStatus = (rawStatus: string | null | undefined): MirroredTrainingStatus => {
    switch (String(rawStatus || '').toUpperCase()) {
        case 'COMPLETED':
            return 'completed';
        case 'IN_PROGRESS':
        case 'STARTED':
            return 'in_progress';
        case 'FAILED':
            return 'failed';
        case 'EXPIRED':
            return 'expired';
        default:
            return 'not_started';
    }
};

const isRecordValid = (record: { status: string; expiresAt: Date | null }): boolean => {
    if (String(record.status || '').toUpperCase() !== 'COMPLETED') return false;
    if (!record.expiresAt) return true;
    return record.expiresAt.getTime() > Date.now();
};

export class EnablerTrainingGateService {
    /**
     * Evaluate the enabler training requirement for a Maysar user.
     * Fails closed: any error reading the training domain marks the requirement
     * unsatisfied, so an infrastructure problem can never activate an enabler.
     */
    async evaluate(learnerId: string, learnerRole = 'enabler'): Promise<EnablerTrainingRequirement> {
        try {
            const [mandatoryRequirements, records] = await Promise.all([
                prisma.training_CertificationRequirement.findMany({ where: { mandatory: true } }),
                prisma.training_TrainingRecord.findMany({
                    where: { learnerId, learnerRole },
                    orderBy: { updatedAt: 'desc' },
                }),
            ]);

            const mandatoryModules = mandatoryRequirements.map((requirement) => requirement.module);
            const validModuleIds = new Set(
                records.filter((record) => isRecordValid(record)).map((record) => record.moduleId)
            );
            const missingModules = mandatoryModules.filter((moduleId) => !validModuleIds.has(moduleId));
            const trainingRequired = mandatoryModules.length > 0;

            const completedRecord = records.find((record) => isRecordValid(record));
            const mirroredStatus = this.aggregateStatus(records);

            return {
                trainingRequired,
                satisfied: !trainingRequired || missingModules.length === 0,
                mirroredStatus: trainingRequired && missingModules.length === 0 ? 'completed' : mirroredStatus,
                completedAt: completedRecord?.completedAt ?? null,
                mandatoryModules,
                missingModules,
            };
        } catch {
            return {
                trainingRequired: true,
                satisfied: false,
                mirroredStatus: 'not_started',
                completedAt: null,
                mandatoryModules: [],
                missingModules: [],
            };
        }
    }

    private aggregateStatus(records: Array<{ status: string; expiresAt: Date | null }>): MirroredTrainingStatus {
        if (records.some((record) => isRecordValid(record))) return 'completed';

        const statuses = records.map((record) => toMirroredStatus(record.status));
        if (statuses.includes('in_progress')) return 'in_progress';
        if (statuses.includes('failed')) return 'failed';
        if (statuses.includes('expired')) return 'expired';
        return 'not_started';
    }
}
