import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { TYPES } from '../../types';
import { ITicketRepository, ITicketMessageRepository, ITicketAttachmentRepository } from '../../domain/repositories/interfaces';
import { AddMessageDto, MessageResponseDto } from '../dto/message.dto';
import { TicketMessage } from '../../domain/entities/ticket-message.entity';
import { MessageMapper } from '../mappers/message.mapper';
import { MessageAddedEvent } from '../../domain/events/ticket-events';

@injectable()
export class AddMessageUseCase {
    constructor(
        @inject(TYPES.ITicketRepository) private ticketRepository: ITicketRepository,
        @inject(TYPES.ITicketMessageRepository) private messageRepository: ITicketMessageRepository,
        @inject(TYPES.ITicketAttachmentRepository) private attachmentRepository: ITicketAttachmentRepository,
        @inject(TYPES.EventBus) private eventBus: any
    ) { }

    public async execute(dto: AddMessageDto): Promise<MessageResponseDto> {
        const ticket = await this.ticketRepository.findById(dto.ticketId);
        if (!ticket) {
            throw new Error(`Ticket not found: ${dto.ticketId}`);
        }

        const messageId = uuidv4();
        const message = TicketMessage.create({
            id: messageId,
            ticketId: dto.ticketId,
            senderId: dto.senderId,
            senderType: dto.senderType,
            content: dto.content,
            isInternal: dto.isInternal
        });

        const validation = message.validate();
        if (!validation.isValid) {
            throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
        }

        const savedMessage = await this.messageRepository.create(message);

        // Update attachments with messageId
        if (dto.attachments && dto.attachments.length > 0) {
            for (const attachmentId of dto.attachments) {
                await this.attachmentRepository.update(attachmentId, {
                    messageId: savedMessage.id
                });
            }
        }

        const event = new MessageAddedEvent(
            ticket.id,
            savedMessage.id,
            savedMessage.senderId,
            savedMessage.senderType
        );

        if (this.eventBus.publish) {
            await this.eventBus.publish('MessageAdded', event);
        }

        return MessageMapper.toResponseDto(savedMessage);
    }
}
