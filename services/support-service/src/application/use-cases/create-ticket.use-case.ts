import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { TYPES } from '../../types';
import { Ticket } from '../../domain/entities/ticket.entity';
import { TicketMapper } from '../mappers/ticket.mapper';
import { TicketCreatedEvent } from '../../domain/events/ticket-events';
import { TicketStatusHistory } from '../../domain/types';
import { ITicketRepository, ITicketStatusHistoryRepository, ITicketAttachmentRepository } from '../../domain/repositories/interfaces';
import { CreateTicketDto, TicketResponseDto } from '../dto/ticket.dto';
import { EventBus } from '../../../../shared/events/eventBus';

@injectable()
export class CreateTicketUseCase {
    constructor(
        @inject(TYPES.ITicketRepository) private ticketRepository: ITicketRepository,
        @inject(TYPES.ITicketStatusHistoryRepository) private historyRepository: ITicketStatusHistoryRepository,
        @inject(TYPES.ITicketAttachmentRepository) private attachmentRepository: ITicketAttachmentRepository,
        @inject(TYPES.EventBus) private eventBus: any
    ) { }

    public async execute(dto: CreateTicketDto): Promise<TicketResponseDto> {
        const ticketId = uuidv4();
        const ticket = Ticket.create({
            id: ticketId,
            userId: dto.userId,
            subject: dto.subject,
            description: dto.description,
            category: dto.category,
            priority: dto.priority
        });

        const validation = ticket.validate();
        if (!validation.isValid) {
            throw new Error(`Invalid ticket data: ${validation.errors.join(', ')}`);
        }

        const savedTicket = await this.ticketRepository.create(ticket);

        // Record initial status history
        const statusHistory: TicketStatusHistory = {
            id: uuidv4(),
            fromStatus: undefined as any,
            toStatus: savedTicket.status,
            changedBy: savedTicket.userId,
            reason: 'Ticket Created',
            createdAt: new Date()
        };
        await this.historyRepository.create(statusHistory, savedTicket.id);

        // Save attachments if any
        if (dto.attachments && dto.attachments.length > 0) {
            for (const attDto of dto.attachments) {
                await this.attachmentRepository.create({
                    id: attDto.id || uuidv4(),
                    fileName: attDto.fileName,
                    fileUrl: attDto.fileUrl,
                    fileSize: attDto.fileSize,
                    mimeType: attDto.mimeType,
                    uploadedBy: savedTicket.userId
                }, savedTicket.id);
            }
        }

        // TODO: Publish event (Infrastructure layer will handle this better via outbox)
        const event = new TicketCreatedEvent(
            savedTicket.id,
            savedTicket.userId,
            savedTicket.subject,
            savedTicket.priority,
            savedTicket.category
        );

        if (this.eventBus.publish) {
            await this.eventBus.publish('TicketCreated', event);
        }

        return TicketMapper.toResponseDto(savedTicket);
    }
}
