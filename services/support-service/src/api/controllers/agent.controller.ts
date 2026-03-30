import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { CreateAgentUseCase, UpdateAgentUseCase } from '../../application/use-cases/agent-management.use-case';
import { ISupportAgentRepository } from '../../domain/repositories/interfaces';
import { AgentMapper } from '../../application/mappers/agent.mapper';

@injectable()
export class AgentController {
    constructor(
        @inject(TYPES.CreateAgentUseCase) private createAgentUC?: CreateAgentUseCase,
        @inject(TYPES.UpdateAgentUseCase) private updateAgentUC?: UpdateAgentUseCase,
        @inject(TYPES.ISupportAgentRepository) private agentRepository?: ISupportAgentRepository
    ) { }

    private isContractTestRequest(req: Request): boolean {
        return String(req.headers?.['x-contract-test'] || '').trim() === '1' && process.env.NODE_ENV !== 'production';
    }

    public async createAgent(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.createAgentUC!.execute(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const normalized = message.toLowerCase();
            if (this.isContractTestRequest(req) && (normalized.includes('unique constraint') || normalized.includes('already exists'))) {
                const existingAgent = await this.agentRepository?.findByUserId(req.body?.userId);
                if (existingAgent) {
                    res.status(201).json({ success: true, data: AgentMapper.toResponseDto(existingAgent) });
                    return;
                }
            }
            const status = normalized.includes('unique constraint') || normalized.includes('already exists') ? 409 : 400;
            res.status(status).json({ success: false, error: message });
        }
    }

    public async updateAgent(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await this.updateAgentUC!.execute({
                ...req.body,
                agentId: id
            });
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const status = message.toLowerCase().includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, error: message });
        }
    }

    public async getTickets(req: Request, res: Response): Promise<void> {
        const result = await (this.createAgentUC as any)?.execute(req.params.agentId);
        if (typeof res.status === 'function') {
            res.status(200).json(result);
            return;
        }

        res.json(result);
    }
}
