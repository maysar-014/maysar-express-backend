import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { CreateAgentUseCase, UpdateAgentUseCase } from '../../application/use-cases/agent-management.use-case';

@injectable()
export class AgentController {
    constructor(
        @inject(TYPES.CreateAgentUseCase) private createAgentUC: CreateAgentUseCase,
        @inject(TYPES.UpdateAgentUseCase) private updateAgentUC: UpdateAgentUseCase
    ) { }

    public async createAgent(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.createAgentUC.execute(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async updateAgent(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await this.updateAgentUC.execute({
                ...req.body,
                agentId: id
            });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
}
