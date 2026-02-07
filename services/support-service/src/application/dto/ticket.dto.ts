import { TicketStatus, TicketPriority } from '../../domain/types';

export interface CreateTicketDto {
    userId: string;
    subject: string;
    description: string;
    category: string;
    priority?: TicketPriority;
    attachments?: TicketAttachmentDto[];
}

export interface UpdateTicketDto {
    subject?: string;
    description?: string;
    category?: string;
    priority?: TicketPriority;
}

export interface TicketResponseDto {
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
}

export interface TicketDetailResponseDto extends TicketResponseDto {
    messages: MessageResponseDto[];
    attachments: TicketAttachmentDto[];
}

export interface AssignTicketDto {
    ticketId: string;
    agentId: string;
    assignedBy: string;
}

export interface UpdateTicketStatusDto {
    ticketId: string;
    newStatus: TicketStatus;
    reason?: string;
    updatedBy: string;
}

export interface ResolveTicketDto {
    ticketId: string;
    agentId: string;
    resolution: string;
}

export interface CloseTicketDto {
    ticketId: string;
    closedBy: string;
    reason?: string;
}

export interface TicketAttachmentDto {
    id?: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
}

export interface ListTicketsDto {
    userId?: string;
    agentId?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedTicketListDto {
    items: TicketResponseDto[];
    total: number;
    page: number;
    limit: number;
}

export interface MessageResponseDto {
    id: string;
    ticketId: string;
    senderId: string;
    senderType: string;
    content: string;
    isInternal: boolean;
    createdAt: Date;
}
