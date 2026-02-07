import { Entity } from '../interfaces';
import { TicketStatus, TicketPriority, TicketStatusHistory } from '../types';

export class Ticket implements Entity {
    public readonly id: string;
    public readonly subject: string;
    public readonly description: string;
    public status: TicketStatus;
    public priority: TicketPriority;
    public readonly category: string;
    public readonly userId: string;
    public assignedAgentId?: string;
    public readonly createdAt: Date;
    public updatedAt: Date;
    public resolvedAt?: Date;
    public closedAt?: Date;
    public resolution?: string;

    constructor(props: {
        id: string;
        subject: string;
        description: string;
        status: TicketStatus;
        priority: TicketPriority;
        category: string;
        userId: string;
        assignedAgentId?: string;
        createdAt: Date;
        updatedAt: Date;
        resolvedAt?: Date;
        closedAt?: Date;
        resolution?: string;
    }) {
        this.id = props.id;
        this.subject = props.subject;
        this.description = props.description;
        this.status = props.status;
        this.priority = props.priority;
        this.category = props.category;
        this.userId = props.userId;
        this.assignedAgentId = props.assignedAgentId;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
        this.resolvedAt = props.resolvedAt;
        this.closedAt = props.closedAt;
        this.resolution = props.resolution;
    }

    public static create(props: {
        id: string;
        subject: string;
        description: string;
        category: string;
        userId: string;
        priority?: TicketPriority;
    }): Ticket {
        return new Ticket({
            ...props,
            status: TicketStatus.OPEN,
            priority: props.priority || TicketPriority.MEDIUM,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    public assignAgent(agentId: string): void {
        if (this.isClosed()) {
            throw new Error('Cannot assign agent to a closed ticket');
        }
        this.assignedAgentId = agentId;
        this.status = TicketStatus.IN_PROGRESS;
        this.updatedAt = new Date();
    }

    public updateStatus(newStatus: TicketStatus): void {
        if (!this.canTransitionTo(newStatus)) {
            throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
        }
        this.status = newStatus;
        this.updatedAt = new Date();

        if (newStatus === TicketStatus.RESOLVED) {
            this.resolvedAt = new Date();
        } else if (newStatus === TicketStatus.CLOSED) {
            this.closedAt = new Date();
        }
    }

    public resolve(resolution: string): void {
        this.resolution = resolution;
        this.updateStatus(TicketStatus.RESOLVED);
    }

    public close(): void {
        this.updateStatus(TicketStatus.CLOSED);
    }

    public reopen(): void {
        if (this.status !== TicketStatus.CLOSED && this.status !== TicketStatus.RESOLVED) {
            throw new Error('Only resolved or closed tickets can be reopened');
        }
        this.status = TicketStatus.IN_PROGRESS;
        this.updatedAt = new Date();
        this.resolvedAt = undefined;
        this.closedAt = undefined;
    }

    public canTransitionTo(newStatus: TicketStatus): boolean {
        if (this.status === TicketStatus.CLOSED) {
            return false; // Closed is terminal unless reopened via explicit method
        }

        const validTransitions: Record<TicketStatus, TicketStatus[]> = {
            [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED],
            [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
            [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
            [TicketStatus.CLOSED]: [TicketStatus.IN_PROGRESS] // Reopening
        };

        return validTransitions[this.status].includes(newStatus);
    }

    public isAssigned(): boolean {
        return !!this.assignedAgentId;
    }

    public isResolved(): boolean {
        return this.status === TicketStatus.RESOLVED;
    }

    public isClosed(): boolean {
        return this.status === TicketStatus.CLOSED;
    }

    public validate(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (!this.subject || this.subject.length < 5) {
            errors.push('Subject must be at least 5 characters');
        }
        if (!this.description || this.description.length < 10) {
            errors.push('Description must be at least 10 characters');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
