import { eventBus } from '../../../../../shared/events/eventBus';
import { AwardBadgeUseCase } from '../use-cases/award-badge.use-case';
import { ILeaderboardRepository } from '../../domain/repositories/leaderboard.repository';
import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { TrainingCompletedEvent } from '../../domain/events/training-completed.event';

export class TrainingCompletionSaga {
    constructor(
        private readonly awardBadgeUseCase: AwardBadgeUseCase,
        private readonly leaderboardRepo: ILeaderboardRepository,
        private readonly trainingRecordRepo: ITrainingRecordRepository
    ) {
        this.setupSubscriptions();
    }

    private setupSubscriptions(): void {
        eventBus.subscribe('TrainingCompleted.v1', this.handleTrainingCompleted.bind(this));
    }

    private async handleTrainingCompleted(event: TrainingCompletedEvent): Promise<void> {
        const { learnerId, score, moduleId } = event;

        try {
            // 1. Update Leaderboard Entry
            const records = await this.trainingRecordRepo.findByLearnerId(learnerId);
            const totalScore = records.reduce((sum, r) => sum + (r.score?.getValue() || 0), 0);
            const completedCount = records.filter(r => r.status === 'COMPLETED').length;

            await this.leaderboardRepo.updateEntry({
                learnerId,
                totalScore,
                modulesCount: completedCount
            });

            // 2. Conditional Badge Awarding
            // Award "Quick Learner" if they passed on the first attempt with a high score
            if (event.remainingAttempts >= 2 && score >= 90) {
                await this.awardBadgeUseCase.execute({
                    learnerId,
                    badgeType: 'QUICK_LEARNER',
                    reason: `Completed ${moduleId} with ${score}% on first attempt`,
                    metadata: { moduleId, score }
                });
            }

            // Award "Veteran" if they completed 5 modules
            if (completedCount === 5) {
                await this.awardBadgeUseCase.execute({
                    learnerId,
                    badgeType: 'VETERAN',
                    reason: 'Completed 5 training modules',
                    metadata: { completedCount }
                });
            }

        } catch (error) {
            console.error('Error in TrainingCompletionSaga:', error);
            // In a real system, we might want to publish a failure event for monitoring
        }
    }
}
