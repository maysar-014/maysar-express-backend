import { TicketStatus, TicketPriority, SenderType } from '../types';

export interface DomainEvent {
    occurredAt: Date;
}

export class TicketCreatedEvent implements DomainEvent {
    public readonly occurredAt: Date = new Date();
    constructor(
        public readonly ticketId: string,
        public readonly userId: string,
        public readonly subject: string,
        public readonly priority: TicketPriority,
        public readonly category: string
    ) { }
}

export class TicketAssignedEvent implements DomainEvent {
    public readonly occurredAt: Date = new Date();
    constructor(
        public readonly ticketId: string,
        public readonly agentId: string,
        public readonly assignedBy: string
    ) { }
}

export class TicketStatusChangedEvent implements DomainEvent {
    public readonly occurredAt: Date = new Date();
    constructor(
        public readonly ticketId: string,
        public readonly fromStatus: TicketStatus,
        public readonly toStatus: TicketStatus,
        public readonly changedBy: string
    ) { }
}

export class TicketResolvedEvent implements DomainEvent {
    public readonly occurredAt: Date = new Date();
    constructor(
        public readonly ticketId: string,
        public readonly agentId: string,
        public readonly resolutionTimeMinutes: number,
        public readonly resolution: string
    ) { }
}

export class TicketClosedEvent implements DomainEvent {
    public readonly occurredAt: Date = new Date();
    constructor(
        public readonly ticketId: string,
        public readonly closedBy: string,
        public readonly reason?: string
    ) { }
}

export class MessageAddedEvent implements DomainEvent {
    public readonly occurredAt: Date = new Date();
    constructor(
        public readonly ticketId: string,
        public readonly messageId: string,
        public readonly senderId: string,
        public readonly senderType: SenderType
    ) { }
}
