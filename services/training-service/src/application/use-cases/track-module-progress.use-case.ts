import { TrackModuleProgressRequest, TrackModuleProgressResponse } from '../dto/track-module-progress.dto';
import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { NotFoundError } from '../../domain/errors/domain.error';
import { IEventPublisher, eventBus } from '@shared-events/eventBus';

export class TrackModuleProgressUseCase {
    constructor(
        private readonly trainingRecordRepo: ITrainingRecordRepository,
        private readonly events: IEventPublisher = eventBus
    ) { }

    public async execute(request: TrackModuleProgressRequest): Promise<TrackModuleProgressResponse> {
        const { trainingRecordId, progressData } = request;

        const record = await this.trainingRecordRepo.findById(trainingRecordId);
        if (!record) {
            throw new NotFoundError('TrainingRecord', trainingRecordId);
        }

        record.updateProgress(progressData);

        await this.trainingRecordRepo.save(record);

        await this.events.publish('TrainingProgressUpdated.v1', {
            trainingRecordId: record.id,
            learnerId: record.learnerId,
            moduleId: record.moduleId,
            progress: record.progress,
            updatedAt: new Date()
        });

        return {
            trainingRecordId: record.id,
            status: record.status,
            updatedAt: new Date()
        };
    }
}
