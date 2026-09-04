import { StartTrainingRequest, StartTrainingResponse } from '../dto/start-training.dto';
import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { ITrainingModuleRepository } from '../../domain/repositories/training-module.repository';
import { ICertificationRequirementRepository } from '../../domain/repositories/certification-requirement.repository';
import { IEventPublisher, eventBus } from '@shared-events/eventBus';
import { TrainingPolicy } from '../../domain/policies/training.policy';
import { TrainingRecord } from '../../domain/entities/training-record.entity';
import { TrainingModule, ContentType, DifficultyLevel } from '../../domain/entities/training-module.entity';
import { CertificationRequirement } from '../../domain/entities/certification-requirement.entity';
import { getModelPrefix, makeId } from '@shared/ids/id';

export class StartTrainingUseCase {
    constructor(
        private readonly trainingRecordRepo: ITrainingRecordRepository,
        private readonly moduleRepo: ITrainingModuleRepository,
        private readonly requirementRepo: ICertificationRequirementRepository,
        private readonly trainingPolicy: TrainingPolicy,
        private readonly events: IEventPublisher = eventBus
    ) { }

    public async execute(request: StartTrainingRequest): Promise<StartTrainingResponse> {
        const { learnerId, learnerRole, moduleId } = request;

        // Load module — if not found in DB, use a welcoming fallback
        // Training is onboarding, not a gate — we never hard-block
        let module = await this.moduleRepo.findById(moduleId);
        if (!module) {
            console.warn(`[Training] Module "${moduleId}" not found in DB, using fallback`);
            module = TrainingModule.create({
                id: moduleId,
                name: 'Maysar Onboarding',
                description: 'Welcome to Maysar! This module will get you started.',
                contentType: ContentType.TEXT,
                content: { type: ContentType.TEXT, body: 'Welcome to the Maysar platform.' },
                durationMinutes: 15,
                category: 'onboarding',
                prerequisites: [],
                targetRoles: [learnerRole || 'courier'],
                isPublic: true,
                difficulty: DifficultyLevel.BEGINNER
            });
        }

        // Load certification requirement — if not found, use permissive defaults
        let certRequirement = await this.requirementRepo.findByModule(moduleId);
        if (!certRequirement) {
            console.warn(`[Training] No certification requirement for module "${moduleId}", using permissive defaults`);
            certRequirement = CertificationRequirement.create({
                module: moduleId,
                minimumScore: 50,
                validityPeriodDays: 365,
                mandatory: false,
                maxAttempts: 10
            });
        }

        const existingRecords = await this.trainingRecordRepo.findByLearnerId(learnerId);
        const completedModuleIds = existingRecords
            .filter(r => r.status === 'COMPLETED' && !r.isExpired())
            .map(r => r.moduleId);

        const validation = this.trainingPolicy.canStartTraining(
            learnerId,
            learnerRole,
            module,
            existingRecords,
            certRequirement,
            completedModuleIds
        );

        // Training is always accessible — informational only
        let record = existingRecords.find(r => r.moduleId === moduleId);

        if (record) {
            record.start();
        } else {
            record = TrainingRecord.createNew(makeId(getModelPrefix('Training_TrainingRecord')), learnerId, learnerRole, moduleId);
            record.start();
        }

        await this.trainingRecordRepo.save(record);

        await this.events.publish('TrainingStarted.v1', {
            trainingRecordId: record.id,
            learnerId: record.learnerId,
            learnerRole: record.learnerRole,
            moduleId: record.moduleId,
            startedAt: record.startedAt,
            attemptNumber: record.attempts
        });

        return {
            trainingRecordId: record.id,
            status: record.status,
            warnings: validation.warnings,
            recommendations: validation.recommendations
        };
    }
}
