import { TrainingModule, ContentType } from '../../domain/entities/training-module.entity';
import { TrainingModuleDTO } from '../dto/training-module.dto';

export class TrainingModuleMapper {
    public static toDTO(entity: TrainingModule): TrainingModuleDTO {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            contentType: entity.contentType,
            content: entity.content,
            durationMinutes: entity.durationMinutes,
            category: entity.category,
            prerequisites: entity.prerequisites
        };
    }

    public static toDomain(props: any): TrainingModule {
        return TrainingModule.create({
            id: props.id,
            name: props.name,
            description: props.description,
            contentType: props.contentType as ContentType,
            content: props.content,
            durationMinutes: props.durationMinutes,
            category: props.category,
            prerequisites: props.prerequisites
        });
    }

    public static toPersistence(entity: TrainingModule): any {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            contentType: entity.contentType,
            content: entity.content,
            durationMinutes: entity.durationMinutes,
            category: entity.category,
            prerequisites: entity.prerequisites
        };
    }
}
