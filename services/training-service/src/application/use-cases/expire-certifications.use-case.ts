import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { IEventPublisher, eventBus } from '../../../../../shared/events/eventBus';

export class ExpireCertificationsUseCase {
    constructor(
        private readonly trainingRecordRepo: ITrainingRecordRepository,
        private readonly events: IEventPublisher = eventBus
    ) { }

    public async execute(): Promise<void> {
        const expiredRecords = await this.trainingRecordRepo.findExpired();

        for (const record of expiredRecords) {
            record.expire();
            await this.trainingRecordRepo.save(record);

            await this.events.publish('CertificationExpired.v1', {
                trainingRecordId: record.id,
                learnerId: record.learnerId,
                moduleId: record.moduleId,
                expiredAt: new Date().toISOString()
            });
        }
    }
}
