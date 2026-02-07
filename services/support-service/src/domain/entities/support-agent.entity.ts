import { Entity } from '../interfaces';

export interface SupportAgentMetrics {
    totalTicketsResolved: number;
    averageResolutionTime?: number;
    rating?: number;
}

export class SupportAgent implements Entity {
    public readonly id: string;
    public readonly userId: string;
    public specializations: string[];
    public maxConcurrentTickets: number;
    public currentTicketCount: number;
    public isAvailable: boolean;
    public readonly metrics: SupportAgentMetrics;
    public readonly createdAt: Date;
    public updatedAt: Date;

    constructor(props: {
        id: string;
        userId: string;
        specializations: string[];
        maxConcurrentTickets: number;
        currentTicketCount: number;
        isAvailable: boolean;
        metrics: SupportAgentMetrics;
        createdAt: Date;
        updatedAt: Date;
    }) {
        this.id = props.id;
        this.userId = props.userId;
        this.specializations = props.specializations;
        this.maxConcurrentTickets = props.maxConcurrentTickets;
        this.currentTicketCount = props.currentTicketCount;
        this.isAvailable = props.isAvailable;
        this.metrics = props.metrics;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }

    public static create(props: {
        id: string;
        userId: string;
        specializations?: string[];
        maxConcurrentTickets?: number;
    }): SupportAgent {
        return new SupportAgent({
            ...props,
            specializations: props.specializations || [],
            maxConcurrentTickets: props.maxConcurrentTickets || 5,
            currentTicketCount: 0,
            isAvailable: true,
            metrics: {
                totalTicketsResolved: 0
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    public assignTicket(): void {
        if (!this.canAcceptTicket()) {
            throw new Error('Agent cannot accept more tickets or is unavailable');
        }
        this.currentTicketCount++;
        this.updatedAt = new Date();
    }

    public unassignTicket(): void {
        if (this.currentTicketCount > 0) {
            this.currentTicketCount--;
            this.updatedAt = new Date();
        }
    }

    public canAcceptTicket(): boolean {
        return this.isAvailable && this.currentTicketCount < this.maxConcurrentTickets;
    }

    public updateAvailability(isAvailable: boolean): void {
        this.isAvailable = isAvailable;
        this.updatedAt = new Date();
    }

    public recordResolution(resolutionTimeMinutes: number): void {
        const totalResolved = this.metrics.totalTicketsResolved + 1;
        let newAvg = resolutionTimeMinutes;

        if (this.metrics.averageResolutionTime !== undefined) {
            newAvg = (this.metrics.averageResolutionTime * this.metrics.totalTicketsResolved + resolutionTimeMinutes) / totalResolved;
        }

        this.metrics.totalTicketsResolved = totalResolved;
        this.metrics.averageResolutionTime = newAvg;
        this.unassignTicket();
        this.updatedAt = new Date();
    }

    public hasSpecialization(category: string): boolean {
        return this.specializations.includes(category);
    }

    public validate(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (!this.userId) {
            errors.push('User ID is required');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
