import { Request, Response } from 'express';
import { FacilitateOrderUseCase } from '../../application/use-cases/facilitate-order.use-case';
import { CalculateEnablerCommissionUseCase } from '../../application/use-cases/calculate-enabler-commission.use-case';

export class EnablerOrderController {
    constructor(
        private readonly facilitateOrderUseCase: FacilitateOrderUseCase,
        private readonly commissionUseCase: CalculateEnablerCommissionUseCase,
        private readonly orderRepository: any
    ) { }

    async createOrder(req: Request, res: Response): Promise<void> {
        try {
            const dto = req.body;
            dto.enablerId = req.params.enablerId; // Ensure enablerId from path is used
            const result = await this.facilitateOrderUseCase.execute(dto);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async getOrders(req: Request, res: Response): Promise<void> {
        try {
            const { enablerId } = req.params;
            const orders = await this.orderRepository.findByEnablerId(enablerId);
            res.status(200).json(orders.map((o: any) => o.toPlainObject()));
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getCommissionBreakdown(req: Request, res: Response): Promise<void> {
        try {
            const { orderId } = req.params;
            const result = await this.commissionUseCase.execute(orderId);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
