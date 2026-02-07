import { SupportAgent } from '../entities/support-agent.entity';
import { Ticket } from '../entities/ticket.entity';

export class TicketAssignmentPolicy {
    public canAssignToAgent(ticket: Ticket, agent: SupportAgent): boolean {
        if (ticket.isClosed()) {
            return false;
        }

        if (!agent.isAvailable) {
            return false;
        }

        if (agent.currentTicketCount >= agent.maxConcurrentTickets) {
            return false;
        }

        return true;
    }

    public findBestAgent(ticket: Ticket, agents: SupportAgent[]): SupportAgent | null {
        const availableAgents = agents.filter(agent => this.canAssignToAgent(ticket, agent));

        if (availableAgents.length === 0) {
            return null;
        }

        // Filter by specialization if possible
        const specializedAgents = availableAgents.filter(agent => agent.hasSpecialization(ticket.category));
        const candidatePool = specializedAgents.length > 0 ? specializedAgents : availableAgents;

        // Select agent with lowest workload
        return candidatePool.reduce((best, current) =>
            current.currentTicketCount < best.currentTicketCount ? current : best
        );
    }

    public validateAssignment(ticket: Ticket, agent: SupportAgent): { isValid: boolean, reason?: string } {
        if (ticket.isClosed()) {
            return { isValid: false, reason: 'Ticket is closed' };
        }
        if (!agent.isAvailable) {
            return { isValid: false, reason: 'Agent is not available' };
        }
        if (agent.currentTicketCount >= agent.maxConcurrentTickets) {
            return { isValid: false, reason: 'Agent has reached maximum ticket capacity' };
        }
        return { isValid: true };
    }
}
