import { Request, Response } from 'express';
import { RegisterEnablerUseCase } from '../../application/use-cases/register-enabler.use-case';
import { ApproveEnablerUseCase } from '../../application/use-cases/approve-enabler.use-case';

export class EnablerController {
    constructor(
        private readonly registerUseCase: RegisterEnablerUseCase,
        private readonly approveUseCase: ApproveEnablerUseCase,
        private readonly enablerRepository: any
    ) { }

    async register(req: Request, res: Response): Promise<void> {
        try {
            const dto = req.body;
            const result = await this.registerUseCase.execute(dto);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async approve(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { adminId } = req.body; // In real app, from auth token
            const result = await this.approveUseCase.execute(id, adminId);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async getProfile(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const enabler = await this.enablerRepository.findById(id);
            if (!enabler) {
                res.status(404).json({ error: 'Enabler not found' });
                return;
            }
            res.status(200).json(enabler.toPlainObject());
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
