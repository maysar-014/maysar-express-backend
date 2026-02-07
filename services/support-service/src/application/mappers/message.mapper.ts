import { TicketMessage } from '../../domain/entities/ticket-message.entity';
import { MessageResponseDto } from '../dto/message.dto';

export class MessageMapper {
    public static toResponseDto(message: TicketMessage): MessageResponseDto {
        return {
            id: message.id,
            ticketId: message.ticketId,
            senderId: message.senderId,
            senderType: message.senderType,
            content: message.content,
            isInternal: message.isInternal,
            createdAt: message.createdAt
        };
    }

    public static toDomain(persistence: any): TicketMessage {
        return new TicketMessage({
            id: persistence.id,
            ticketId: persistence.ticketId,
            senderId: persistence.senderId,
            senderType: persistence.senderType,
            content: persistence.content,
            isInternal: persistence.isInternal,
            createdAt: persistence.createdAt
        });
    }
}
