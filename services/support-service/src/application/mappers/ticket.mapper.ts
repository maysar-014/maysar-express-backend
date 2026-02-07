import { Ticket } from '../../domain/entities/ticket.entity';
import { TicketResponseDto, TicketDetailResponseDto } from '../dto/ticket.dto';
import { MessageMapper } from './message.mapper';

export class TicketMapper {
    public static toResponseDto(ticket: Ticket): TicketResponseDto {
        return {
            id: ticket.id,
            userId: ticket.userId,
            subject: ticket.subject,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            category: ticket.category,
            assignedAgentId: ticket.assignedAgentId,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
            resolvedAt: ticket.resolvedAt,
            closedAt: ticket.closedAt,
            resolution: ticket.resolution
        };
    }

    public static toDetailDto(ticket: Ticket, messages: any[] = [], attachments: any[] = []): TicketDetailResponseDto {
        return {
            ...this.toResponseDto(ticket),
            messages: messages.map(m => MessageMapper.toResponseDto(m)),
            attachments: attachments.map(a => ({
                id: a.id,
                fileName: a.fileName,
                fileUrl: a.fileUrl,
                fileSize: a.fileSize,
                mimeType: a.mimeType
            }))
        };
    }

    public static toDomain(persistence: any): Ticket {
        return new Ticket({
            id: persistence.id,
            userId: persistence.userId,
            subject: persistence.subject,
            description: persistence.description,
            status: persistence.status,
            priority: persistence.priority,
            category: persistence.category,
            assignedAgentId: persistence.assignedAgentId,
            createdAt: persistence.createdAt,
            updatedAt: persistence.updatedAt,
            resolvedAt: persistence.resolvedAt,
            closedAt: persistence.closedAt,
            resolution: persistence.resolution
        });
    }
}
