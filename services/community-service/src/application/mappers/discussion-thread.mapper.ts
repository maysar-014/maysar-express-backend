import { DiscussionThread, DiscussionThreadProps } from '../../domain/entities/discussion-thread.entity';
import { DiscussionThreadDTO } from '../dto/discussion-thread.dto';

export class DiscussionThreadMapper {
    static toDTO(entity: DiscussionThread): DiscussionThreadDTO {
        return {
            id: entity.id,
            authorId: entity.authorId,
            topic: entity.topic,
            content: entity.content,
            category: entity.category,
            status: entity.status,
            expertiseLevel: entity.expertiseLevel,
            businessContext: entity.businessContext,
            maxResponsesPerUser: entity.maxResponsesPerUser,
            acceptedAnswerId: entity.acceptedAnswerId,
            resolvedAt: entity.resolvedAt?.toISOString(),
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }

    static toEntity(dto: DiscussionThreadDTO): DiscussionThread {
        const props: DiscussionThreadProps = {
            id: dto.id,
            authorId: dto.authorId,
            topic: dto.topic,
            content: dto.content,
            category: dto.category,
            status: dto.status as any,
            expertiseLevel: dto.expertiseLevel as any,
            businessContext: dto.businessContext,
            maxResponsesPerUser: dto.maxResponsesPerUser,
            acceptedAnswerId: dto.acceptedAnswerId,
            resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : undefined,
            createdAt: new Date(dto.createdAt),
            updatedAt: new Date(dto.updatedAt),
        };

        return new DiscussionThread(props);
    }

    static toDTOList(entities: DiscussionThread[]): DiscussionThreadDTO[] {
        return entities.map(entity => this.toDTO(entity));
    }
}
