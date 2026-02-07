import { SupportAgent } from '../../domain/entities/support-agent.entity';
import { AgentResponseDto } from '../dto/agent.dto';

export class AgentMapper {
    public static toResponseDto(agent: SupportAgent): AgentResponseDto {
        return {
            id: agent.id,
            userId: agent.userId,
            specializations: agent.specializations,
            maxConcurrentTickets: agent.maxConcurrentTickets,
            currentTicketCount: agent.currentTicketCount,
            isAvailable: agent.isAvailable,
            metrics: {
                totalTicketsResolved: agent.metrics.totalTicketsResolved,
                averageResolutionTime: agent.metrics.averageResolutionTime,
                rating: agent.metrics.rating
            },
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt
        };
    }

    public static toDomain(persistence: any): SupportAgent {
        return new SupportAgent({
            id: persistence.id,
            userId: persistence.userId,
            specializations: persistence.specializations,
            maxConcurrentTickets: persistence.maxConcurrentTickets,
            currentTicketCount: persistence.currentTicketCount,
            isAvailable: persistence.isAvailable,
            metrics: {
                totalTicketsResolved: persistence.totalTicketsResolved,
                averageResolutionTime: persistence.averageResolutionTime,
                rating: persistence.rating
            },
            createdAt: persistence.createdAt,
            updatedAt: persistence.updatedAt
        });
    }
}
