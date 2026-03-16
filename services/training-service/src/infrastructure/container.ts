import { PrismaClient } from '@prisma/client';
import { PrismaTrainingRecordRepository } from './repositories/prisma-training-record.repository';
import { PrismaCertificationRequirementRepository } from './repositories/prisma-certification-requirement.repository';
import { PrismaTrainingModuleRepository } from './repositories/prisma-training-module.repository';
import { PrismaBadgeRepository } from './repositories/prisma-badge.repository';
import { PrismaLeaderboardRepository } from './repositories/prisma-leaderboard.repository';
import { TrainingPolicy } from '../domain/policies/training.policy';
import { EligibilityEngine } from '../domain/engines/eligibility.engine';
import { StartTrainingUseCase } from '../application/use-cases/start-training.use-case';
import { CompleteTrainingUseCase } from '../application/use-cases/complete-training.use-case';
import { GetTrainingProgressUseCase } from '../application/use-cases/get-training-progress.use-case';
import { CheckEligibilityUseCase } from '../application/use-cases/check-eligibility.use-case';
import { TrackModuleProgressUseCase } from '../application/use-cases/track-module-progress.use-case';
import { GetAvailableModulesUseCase } from '../application/use-cases/get-available-modules.use-case';
import { AwardBadgeUseCase } from '../application/use-cases/award-badge.use-case';
import { TrainingCompletionSaga } from '../application/sagas/training-completion.saga';
import { TrainingController } from '../api/controllers/training.controller';
import { ModuleController } from '../api/controllers/module.controller';
import { HealthController } from '../api/controllers/health.controller';
import { createPrismaClient } from '@shared/database/prisma-client';

export class Container {
    private static instance: Container;

    public readonly prisma: PrismaClient;
    public readonly trainingRecordRepo: PrismaTrainingRecordRepository;
    public readonly requirementRepo: PrismaCertificationRequirementRepository;
    public readonly moduleRepo: PrismaTrainingModuleRepository;
    public readonly badgeRepo: PrismaBadgeRepository;
    public readonly leaderboardRepo: PrismaLeaderboardRepository;

    public readonly trainingPolicy: TrainingPolicy;
    public readonly eligibilityEngine: EligibilityEngine;

    public readonly startTrainingUseCase: StartTrainingUseCase;
    public readonly completeTrainingUseCase: CompleteTrainingUseCase;
    public readonly getProgressUseCase: GetTrainingProgressUseCase;
    public readonly checkEligibilityUseCase: CheckEligibilityUseCase;
    public readonly trackProgressUseCase: TrackModuleProgressUseCase;
    public readonly getAvailableModulesUseCase: GetAvailableModulesUseCase;
    public readonly awardBadgeUseCase: AwardBadgeUseCase;

    public readonly trainingCompletionSaga: TrainingCompletionSaga;

    public readonly trainingController: TrainingController;
    public readonly moduleController: ModuleController;
    public readonly healthController: HealthController;

    private constructor() {
        this.prisma = createPrismaClient();

        this.trainingRecordRepo = new PrismaTrainingRecordRepository(this.prisma);
        this.requirementRepo = new PrismaCertificationRequirementRepository(this.prisma);
        this.moduleRepo = new PrismaTrainingModuleRepository(this.prisma);
        this.badgeRepo = new PrismaBadgeRepository(this.prisma);
        this.leaderboardRepo = new PrismaLeaderboardRepository(this.prisma);

        this.trainingPolicy = new TrainingPolicy();
        this.eligibilityEngine = new EligibilityEngine();

        this.startTrainingUseCase = new StartTrainingUseCase(
            this.trainingRecordRepo,
            this.moduleRepo,
            this.requirementRepo,
            this.trainingPolicy
        );

        this.completeTrainingUseCase = new CompleteTrainingUseCase(
            this.trainingRecordRepo,
            this.requirementRepo,
            this.eligibilityEngine
        );

        this.getProgressUseCase = new GetTrainingProgressUseCase(
            this.trainingRecordRepo,
            this.requirementRepo,
            this.eligibilityEngine
        );

        this.checkEligibilityUseCase = new CheckEligibilityUseCase(
            this.trainingRecordRepo,
            this.requirementRepo,
            this.eligibilityEngine
        );

        this.trackProgressUseCase = new TrackModuleProgressUseCase(
            this.trainingRecordRepo
        );

        this.getAvailableModulesUseCase = new GetAvailableModulesUseCase(
            this.moduleRepo,
            this.trainingRecordRepo,
            this.trainingPolicy
        );

        this.awardBadgeUseCase = new AwardBadgeUseCase(
            this.badgeRepo,
            this.leaderboardRepo
        );

        this.trainingCompletionSaga = new TrainingCompletionSaga(
            this.awardBadgeUseCase,
            this.leaderboardRepo,
            this.trainingRecordRepo
        );

        this.trainingController = new TrainingController(
            this.startTrainingUseCase,
            this.completeTrainingUseCase,
            this.getProgressUseCase,
            this.checkEligibilityUseCase,
            this.trackProgressUseCase,
            this.getAvailableModulesUseCase
        );

        this.moduleController = new ModuleController(
            this.moduleRepo,
            this.leaderboardRepo,
            this.badgeRepo
        );
        this.healthController = new HealthController();
    }

    public static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
}
