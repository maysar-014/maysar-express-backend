import { Ticket } from '../entities/ticket.entity';
import { TicketPriority } from '../types';

export class TicketEscalationPolicy {
    public shouldEscalate(ticket: Ticket): boolean {
        if (ticket.isResolved() || ticket.isClosed()) {
            return false;
        }

        const now = new Date();
        const ageInHours = (now.getTime() - ticket.updatedAt.getTime()) / (1000 * 60 * 60);

        // Rule 1: High priority tickets not updated for 4 hours
        if (ticket.priority === TicketPriority.HIGH && ageInHours > 4) {
            return true;
        }

        // Rule 2: Medium priority tickets not updated for 24 hours
        if (ticket.priority === TicketPriority.MEDIUM && ageInHours > 24) {
            return true;
        }

        // Rule 3: Unassigned tickets older than 1 hour
        if (!ticket.isAssigned() && (now.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60) > 1) {
            return true;
        }

        return false;
    }

    public getEscalationPriority(ticket: Ticket): TicketPriority {
        switch (ticket.priority) {
            case TicketPriority.LOW:
                return TicketPriority.MEDIUM;
            case TicketPriority.MEDIUM:
                return TicketPriority.HIGH;
            case TicketPriority.HIGH:
                return TicketPriority.URGENT;
            case TicketPriority.URGENT:
                return TicketPriority.URGENT;
            default:
                return ticket.priority;
        }
    }

    public getEscalationReason(ticket: Ticket): string {
        if (!ticket.isAssigned()) {
            return 'Ticket remains unassigned for too long';
        }
        return 'No update on ticket within the required SLA';
    }
}
