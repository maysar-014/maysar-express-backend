/**
 * Shared Contracts for Support Service
 * Defines enums, DTOs, and event payloads for inter-service communication
 */

export enum Support_TicketStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED'
}

export enum Support_TicketPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

export enum Support_SenderType {
    USER = 'USER',
    AGENT = 'AGENT',
    SYSTEM = 'SYSTEM'
}

// DTOs
export interface TicketResponseDto {
    id: string;
    userId: string;
    subject: string;
    description: string;
    status: Support_TicketStatus;
    priority: Support_TicketPriority;
    category: string;
    assignedAgentId?: string;
    resolution?: string;
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string;
    closedAt?: string;
}

export interface TicketMessageResponseDto {
    id: string;
    ticketId: string;
    senderId: string;
    senderType: Support_SenderType;
    content: string;
    isInternal: boolean;
    createdAt: string;
}

// Event Payloads
export interface TicketCreatedEventPayload {
    ticketId: string;
    userId: string;
    subject: string;
    priority: Support_TicketPriority;
    category: string;
}

export interface TicketAssignedEventPayload {
    ticketId: string;
    agentId: string;
    assignedBy: string;
}

export interface TicketStatusChangedEventPayload {
    ticketId: string;
    fromStatus: Support_TicketStatus;
    toStatus: Support_TicketStatus;
    changedBy: string;
    reason?: string;
}

export interface TicketResolvedEventPayload {
    ticketId: string;
    agentId: string;
    resolution: string;
}

export interface TicketClosedEventPayload {
    ticketId: string;
    closedBy: string;
    reason?: string;
}

export interface MessageAddedEventPayload {
    messageId: string;
    ticketId: string;
    senderId: string;
    senderType: Support_SenderType;
}
