import { TrainingRecord } from '../../domain/entities/training-record.entity';
import { TrainingRecordDTO } from '../dto/training-progress.dto';
import { TrainingScore } from '../../domain/value-objects/training-score.value-object';
import { TrainingStatus } from '../../domain/value-objects/training-status.value-object';

export class TrainingRecordMapper {
    public static toDTO(entity: TrainingRecord): TrainingRecordDTO {
        return {
            id: entity.id,
            moduleId: entity.moduleId,
            status: entity.status,
            startedAt: entity.startedAt,
            completedAt: entity.completedAt,
            score: entity.score?.getValue(),
            attempts: entity.attempts,
            expiresAt: entity.expiresAt
        };
    }

    public static toDomain(props: any): TrainingRecord {
        return TrainingRecord.create({
            id: props.id,
            learnerId: props.learnerId,
            learnerRole: props.learnerRole,
            moduleId: props.moduleId,
            status: props.status as TrainingStatus,
            startedAt: props.startedAt,
            completedAt: props.completedAt,
            score: props.score ? TrainingScore.create(props.score) : undefined,
            attempts: props.attempts,
            expiresAt: props.expiresAt
        });
    }

    public static toPersistence(entity: TrainingRecord): any {
        return {
            id: entity.id,
            learnerId: entity.learnerId,
            learnerRole: entity.learnerRole,
            moduleId: entity.moduleId,
            status: entity.status,
            startedAt: entity.startedAt,
            completedAt: entity.completedAt,
            score: entity.score?.getValue(),
            attempts: entity.attempts,
            expiresAt: entity.expiresAt
        };
    }
}
