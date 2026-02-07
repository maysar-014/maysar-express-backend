
import { Request, Response } from 'express';
import { CreateProductionPlan } from '../../application/use-cases/CreateProductionPlan';
import { UpdateProductionStatus } from '../../application/use-cases/UpdateProductionStatus';
import { RecordQualityCheckpoint } from '../../application/use-cases/RecordQualityCheckpoint';
import { GetProductionDashboard } from '../../application/use-cases/GetProductionDashboard';
import { CalculateProductionCapacity } from '../../application/use-cases/CalculateProductionCapacity';
import { ProductionStatus } from '../../domain/entities/ProductionPlan.entity';

export class ProductionController {
    constructor(
        private readonly createPlanUseCase: CreateProductionPlan,
        private readonly updateStatusUseCase: UpdateProductionStatus,
        private readonly recordQualityUseCase: RecordQualityCheckpoint,
        private readonly getDashboardUseCase: GetProductionDashboard,
        private readonly calculateCapacityUseCase: CalculateProductionCapacity
    ) { }

    async createPlan(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.createPlanUseCase.execute(req.body);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async updateStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { status } = req.body;
            await this.updateStatusUseCase.execute(id, status as ProductionStatus);
            res.status(200).send();
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async recordQuality(req: Request, res: Response): Promise<void> {
        try {
            await this.recordQualityUseCase.execute(req.body);
            res.status(201).send();
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            // Assuming we get supplierId from auth middleware user context
            const supplierId = (req as any).user?.supplierId || req.query.supplierId;
            if (!supplierId) {
                res.status(400).json({ error: 'Supplier ID required' });
                return;
            }
            const result = await this.getDashboardUseCase.execute(supplierId);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getCapacity(req: Request, res: Response): Promise<void> {
        try {
            const { supplierId, date } = req.query as any;
            // Assuming calculateCapacityUseCase takes string date or Date object
            const result = await this.calculateCapacityUseCase.execute(supplierId, date ? new Date(date) : new Date());
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
