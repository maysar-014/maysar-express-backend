import { Ticket } from '../entities/ticket.entity';
import { TicketMessage } from '../entities/ticket-message.entity';
import { SupportAgent } from '../entities/support-agent.entity';
import { TicketStatus, TicketStatusHistory } from '../types';

export interface ITicketRepository {
    findById(id: string): Promise<Ticket | null>;
    findByUserId(userId: string): Promise<Ticket[]>;
    findByAgentId(agentId: string): Promise<Ticket[]>;
    findByStatus(status: TicketStatus): Promise<Ticket[]>;
    findByStatuses(statuses: TicketStatus[]): Promise<Ticket[]>;
    create(ticket: Ticket): Promise<Ticket>;
    update(ticket: Ticket): Promise<Ticket>;
    delete(id: string): Promise<void>;
    search(query: any): Promise<Ticket[]>;
    count(query: any): Promise<number>;
}

export interface ITicketStatusHistoryRepository {
    create(history: TicketStatusHistory, ticketId: string): Promise<TicketStatusHistory>;
    findByTicketId(ticketId: string): Promise<TicketStatusHistory[]>;
}

export interface ITicketAttachmentRepository {
    create(attachment: any, ticketId: string, messageId?: string): Promise<any>;
    update(id: string, data: any): Promise<any>;
    findByTicketId(ticketId: string): Promise<any[]>;
    findByMessageId(messageId: string): Promise<any[]>;
}

export interface ISupportAgentRepository {
    findById(id: string): Promise<SupportAgent | null>;
    findByUserId(userId: string): Promise<SupportAgent | null>;
    findAvailable(): Promise<SupportAgent[]>;
    findBySpecialization(specialization: string): Promise<SupportAgent[]>;
    create(agent: SupportAgent): Promise<SupportAgent>;
    update(agent: SupportAgent): Promise<SupportAgent>;
}

export interface ITicketMessageRepository {
    findById(id: string): Promise<TicketMessage | null>;
    findByTicketId(ticketId: string): Promise<TicketMessage[]>;
    create(message: TicketMessage): Promise<TicketMessage>;
    count(ticketId: string): Promise<number>;
}
