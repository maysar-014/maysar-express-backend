export enum TicketStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED'
}

export enum TicketPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

export enum SenderType {
    USER = 'USER',
    AGENT = 'AGENT',
    SYSTEM = 'SYSTEM'
}

export interface TicketStatusHistory {
    id: string;
    fromStatus: TicketStatus;
    toStatus: TicketStatus;
    changedBy: string;
    reason?: string;
    createdAt: Date;
}
