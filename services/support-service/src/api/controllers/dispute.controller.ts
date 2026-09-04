import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { TYPES } from '../../types';
import { CreateTicketUseCase } from '../../application/use-cases/create-ticket.use-case';
import { ListTicketsUseCase } from '../../application/use-cases/list-tickets.use-case';
import { ITicketAttachmentRepository, ITicketMessageRepository, ITicketRepository } from '../../domain/repositories/interfaces';
import { SenderType, TicketPriority, TicketStatus } from '../../domain/types';
import { TicketMessage } from '../../domain/entities/ticket-message.entity';
import { MessageMapper } from '../../application/mappers/message.mapper';
import { TicketMapper } from '../../application/mappers/ticket.mapper';

const DISPUTE_CATEGORY = 'order_dispute';
const ORDER_ID_PREFIX = 'Order ID:';
const REASON_PREFIX = 'Reason:';

type TicketLike = {
    id: string;
    userId: string;
    subject: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: string;
    assignedAgentId?: string;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
    closedAt?: Date;
    resolution?: string;
};

type AttachmentLike = {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
};

@injectable()
export class DisputeController {
    constructor(
        @inject(TYPES.CreateTicketUseCase) private readonly createTicketUseCase: CreateTicketUseCase,
        @inject(TYPES.ListTicketsUseCase) private readonly listTicketsUseCase: ListTicketsUseCase,
        @inject(TYPES.ITicketRepository) private readonly ticketRepository: ITicketRepository,
        @inject(TYPES.ITicketMessageRepository) private readonly messageRepository: ITicketMessageRepository,
        @inject(TYPES.ITicketAttachmentRepository) private readonly attachmentRepository: ITicketAttachmentRepository
    ) {}

    private isManager(req: Request): boolean {
        return req.user?.roles?.some(role => ['admin', 'agent'].includes(role)) ?? false;
    }

    private isSupportStaff(req: Request): boolean {
        return req.user?.roles?.some(role => ['admin', 'agent'].includes(role)) ?? false;
    }

    private canAccess(req: Request, ticket: TicketLike): boolean {
        return this.isManager(req) || req.user?.userId === ticket.userId;
    }

    private formatDisputeDescription(orderId: string, reason: string, description: string): string {
        return `${ORDER_ID_PREFIX} ${orderId}\n${REASON_PREFIX} ${reason}\n\n${description}`.trim();
    }

    private extractDisputeFields(ticket: TicketLike) {
        const lines = ticket.description.split(/\r?\n/);
        const orderIdLine = lines.find(line => line.startsWith(ORDER_ID_PREFIX));
        const reasonLine = lines.find(line => line.startsWith(REASON_PREFIX));

        const orderId = orderIdLine ? orderIdLine.slice(ORDER_ID_PREFIX.length).trim() : null;
        const reason = reasonLine ? reasonLine.slice(REASON_PREFIX.length).trim() : null;
        const narrative = lines
            .filter(line => !line.startsWith(ORDER_ID_PREFIX) && !line.startsWith(REASON_PREFIX))
            .join('\n')
            .trim();

        return {
            orderId,
            reason,
            narrative
        };
    }

    private toDisputeResponse(ticket: TicketLike, attachments: AttachmentLike[] = [], messages: unknown[] = []) {
        const base = TicketMapper.toResponseDto(ticket as never);
        const derived = this.extractDisputeFields(ticket);

        return {
            ...base,
            orderId: derived.orderId,
            reason: derived.reason,
            description: derived.narrative || ticket.description,
            category: DISPUTE_CATEGORY,
            attachments: attachments.map(attachment => ({
                id: attachment.id,
                fileName: attachment.fileName,
                fileUrl: attachment.fileUrl,
                fileSize: attachment.fileSize,
                mimeType: attachment.mimeType
            })),
            messages: messages.map(message => MessageMapper.toResponseDto(message as never))
        };
    }

    private nextPriority(current: TicketPriority): TicketPriority | null {
        switch (current) {
            case TicketPriority.LOW:
                return TicketPriority.MEDIUM;
            case TicketPriority.MEDIUM:
                return TicketPriority.HIGH;
            case TicketPriority.HIGH:
                return TicketPriority.URGENT;
            case TicketPriority.URGENT:
            default:
                return null;
        }
    }

    private async getDisputeOrRespond(req: Request, res: Response): Promise<TicketLike | null> {
        const ticket = await this.ticketRepository.findById(req.params.id);
        if (!ticket || ticket.category !== DISPUTE_CATEGORY) {
            res.status(404).json({ success: false, error: 'Dispute not found' });
            return null;
        }

        if (!this.canAccess(req, ticket as TicketLike)) {
            res.status(403).json({ success: false, error: 'Forbidden' });
            return null;
        }

        return ticket as TicketLike;
    }

    public async createDispute(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { reason, description, subject, priority, attachments } = req.body;
            const orderId = req.body.orderId ?? req.body.ticketId;

            const result = await this.createTicketUseCase.execute({
                userId,
                subject: subject?.trim() || `Order dispute for ${orderId}`,
                description: this.formatDisputeDescription(orderId, reason, description),
                category: DISPUTE_CATEGORY,
                priority,
                attachments
            });

            res.status(201).json({
                success: true,
                data: {
                    ...result,
                    orderId,
                    reason,
                    description,
                    category: DISPUTE_CATEGORY,
                    attachments: attachments ?? []
                }
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async listDisputes(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.listTicketsUseCase.execute({
                ...req.query,
                category: DISPUTE_CATEGORY,
                userId: this.isManager(req) ? (req.query.userId as string | undefined) : req.user!.userId
            } as never);

            res.status(200).json({
                success: true,
                data: {
                    ...result,
                    items: result.items.map(item => this.toDisputeResponse(item as never))
                }
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async getDispute(req: Request, res: Response): Promise<void> {
        try {
            const ticket = await this.getDisputeOrRespond(req, res);
            if (!ticket) return;

            const [messages, attachments] = await Promise.all([
                this.messageRepository.findByTicketId(ticket.id),
                this.attachmentRepository.findByTicketId(ticket.id)
            ]);

            const baseResponse = this.toDisputeResponse(ticket, attachments as AttachmentLike[], messages);
            // Surface ESCALATED status when the dispute priority has been raised above LOW.
            // Priority escalation is the mechanism for escalation — no separate DB status field.
            const derivedStatus = ticket.priority !== TicketPriority.LOW && ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED
                ? 'ESCALATED'
                : baseResponse.status;

            res.status(200).json({
                success: true,
                data: { ...baseResponse, status: derivedStatus }
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async escalateDispute(req: Request, res: Response): Promise<void> {
        try {
            const ticket = await this.getDisputeOrRespond(req, res);
            if (!ticket) return;

            if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
                res.status(409).json({ success: false, error: 'Cannot escalate a closed dispute' });
                return;
            }

            const requestedPriority = req.body.priority as TicketPriority | undefined;
            const next = requestedPriority ?? this.nextPriority(ticket.priority);
            if (!next || next === ticket.priority) {
                res.status(409).json({ success: false, error: 'Dispute is already at the highest priority' });
                return;
            }

            ticket.priority = next;
            ticket.updatedAt = new Date();
            const updated = await this.ticketRepository.update(ticket as never);

            const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
            if (reason) {
                const senderType = this.isSupportStaff(req) ? SenderType.AGENT : SenderType.USER;
                const note = TicketMessage.create({
                    id: makeId(getModelPrefix('Support_TicketMessage')),
                    ticketId: updated.id,
                    senderId: req.user!.userId,
                    senderType,
                    content: `Dispute escalated to ${next}: ${reason}`,
                    isInternal: senderType === SenderType.AGENT
                });
                await this.messageRepository.create(note);
            }

            const attachments = await this.attachmentRepository.findByTicketId(updated.id);
            res.status(200).json({
                success: true,
                data: {
                    ...this.toDisputeResponse(updated as never, attachments as AttachmentLike[]),
                    // Surface escalated status synthetically — stored as IN_PROGRESS in DB
                    // but exposed as ESCALATED to consumers after a priority bump.
                    status: 'ESCALATED'
                }
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async addEvidence(req: Request, res: Response): Promise<void> {
        try {
            const ticket = await this.getDisputeOrRespond(req, res);
            if (!ticket) return;

            const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
            const attachmentsInput = Array.isArray(req.body.attachments) ? req.body.attachments : [];

            let createdMessage: TicketMessage | null = null;
            if (note || attachmentsInput.length > 0) {
                const senderType = this.isSupportStaff(req) ? SenderType.AGENT : SenderType.USER;
                createdMessage = await this.messageRepository.create(TicketMessage.create({
                    id: makeId(getModelPrefix('Support_TicketMessage')),
                    ticketId: ticket.id,
                    senderId: req.user!.userId,
                    senderType,
                    content: note || 'Evidence attached',
                    isInternal: false
                }));
            }

            const createdAttachments = [];
            for (const attachment of attachmentsInput) {
                const createdAttachment = await this.attachmentRepository.create({
                    id: makeId(getModelPrefix('Support_TicketAttachment')),
                    fileName: attachment.fileName,
                    fileUrl: attachment.fileUrl,
                    fileSize: attachment.fileSize,
                    mimeType: attachment.mimeType,
                    uploadedBy: req.user!.userId
                }, ticket.id, createdMessage?.id);
                createdAttachments.push(createdAttachment);
            }

            res.status(201).json({
                success: true,
                data: {
                    disputeId: ticket.id,
                    message: createdMessage ? MessageMapper.toResponseDto(createdMessage) : null,
                    attachments: createdAttachments.map((attachment: AttachmentLike) => ({
                        id: attachment.id,
                        fileName: attachment.fileName,
                        fileUrl: attachment.fileUrl,
                        fileSize: attachment.fileSize,
                        mimeType: attachment.mimeType
                    }))
                }
            });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
}
