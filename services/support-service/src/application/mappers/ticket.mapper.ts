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

    public static toDTO(ticket: any): TicketResponseDto {
        return {
            id: ticket.id,
            userId: ticket.userId ?? ticket.getUserId?.(),
            subject: ticket.subject ?? ticket.getSubject?.(),
            description: ticket.description ?? ticket.getDescription?.(),
            status: ticket.status ?? ticket.getStatus?.(),
            priority: ticket.priority ?? ticket.getPriority?.(),
            category: ticket.category ?? ticket.getCategory?.(),
            assignedAgentId: ticket.assignedAgentId ?? ticket.getAssignedAgentId?.(),
            createdAt: ticket.createdAt ?? ticket.getCreatedAt?.() ?? new Date(),
            updatedAt: ticket.updatedAt ?? ticket.getUpdatedAt?.() ?? new Date(),
            resolvedAt: ticket.resolvedAt ?? ticket.getResolvedAt?.(),
            closedAt: ticket.closedAt ?? ticket.getClosedAt?.(),
            resolution: ticket.resolution ?? ticket.getResolution?.()
        };
    }

    public static toDTOList(tickets: any[]): TicketResponseDto[] {
        return tickets.map(ticket => this.toDTO(ticket));
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
