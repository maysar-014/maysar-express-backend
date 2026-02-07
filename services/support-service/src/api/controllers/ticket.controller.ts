import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { CreateTicketUseCase } from '../../application/use-cases/create-ticket.use-case';
import { AssignTicketUseCase } from '../../application/use-cases/assign-ticket.use-case';
import { UpdateTicketStatusUseCase } from '../../application/use-cases/update-ticket-status.use-case';
import { AddMessageUseCase } from '../../application/use-cases/add-message.use-case';
import { ResolveTicketUseCase } from '../../application/use-cases/resolve-ticket.use-case';
import { CloseTicketUseCase } from '../../application/use-cases/close-ticket.use-case';
import { GetTicketUseCase } from '../../application/use-cases/get-ticket.use-case';
import { ListTicketsUseCase } from '../../application/use-cases/list-tickets.use-case';

@injectable()
export class TicketController {
    constructor(
        @inject(TYPES.CreateTicketUseCase) private createTicketUC: CreateTicketUseCase,
        @inject(TYPES.AssignTicketUseCase) private assignTicketUC: AssignTicketUseCase,
        @inject(TYPES.UpdateTicketStatusUseCase) private updateStatusUC: UpdateTicketStatusUseCase,
        @inject(TYPES.AddMessageUseCase) private addMessageUC: AddMessageUseCase,
        @inject(TYPES.ResolveTicketUseCase) private resolveTicketUC: ResolveTicketUseCase,
        @inject(TYPES.CloseTicketUseCase) private closeTicketUC: CloseTicketUseCase,
        @inject(TYPES.GetTicketUseCase) private getTicketUC: GetTicketUseCase,
        @inject(TYPES.ListTicketsUseCase) private listTicketsUC: ListTicketsUseCase
    ) { }

    public async createTicket(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const result = await this.createTicketUC.execute({
                ...req.body,
                userId
            });
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async getTicket(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;
            const result = await this.getTicketUC.execute(id, userId);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(404).json({ success: false, error: error instanceof Error ? error.message : 'Ticket not found' });
        }
    }

    public async listTickets(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const isAdminOrAgent = req.user!.roles.some(r => ['admin', 'agent'].includes(r));
            const query = {
                ...req.query,
                userId: isAdminOrAgent ? (req.query.userId || undefined) : userId
            };
            const result = await this.listTicketsUC.execute(query as any);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async addMessage(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const senderId = req.user!.userId;
            const result = await this.addMessageUC.execute({
                ...req.body,
                ticketId: id,
                senderId
            });
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async assignTicket(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const assignedBy = req.user!.userId;
            const result = await this.assignTicketUC.execute({
                ticketId: id,
                agentId: req.body.agentId,
                assignedBy
            });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async resolveTicket(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const agentId = req.user!.userId;
            const result = await this.resolveTicketUC.execute({
                ticketId: id,
                agentId,
                resolution: req.body.resolution
            });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async closeTicket(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const closedBy = req.user!.userId;
            const result = await this.closeTicketUC.execute({
                ticketId: id,
                closedBy,
                reason: req.body.reason
            });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
}
