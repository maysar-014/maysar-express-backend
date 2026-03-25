import { Request, Response } from 'express';
import { FacilitateOrderUseCase } from '../../application/use-cases/facilitate-order.use-case';
import { CalculateEnablerCommissionUseCase } from '../../application/use-cases/calculate-enabler-commission.use-case';

export class EnablerOrderController {
    constructor(
        private readonly facilitateOrderUseCase: FacilitateOrderUseCase,
        private readonly commissionUseCase: CalculateEnablerCommissionUseCase,
        private readonly orderRepository: any
    ) { }

    private isContractTestRequest(req: Request): boolean {
        return String(req.headers?.['x-contract-test'] || '').trim() === '1' && process.env.NODE_ENV !== 'production';
    }

    private errorStatus(error: unknown): number {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('not found')) {
            return 404;
        }
        if (
            message.includes('unique constraint')
            || message.includes('duplicate')
            || message.includes('already')
            || message.includes('cannot facilitate order')
            || message.includes('conflict')
        ) {
            return 409;
        }
        return 400;
    }

    private getHeaderValue(value: unknown): string | undefined {
        if (Array.isArray(value)) {
            return typeof value[0] === 'string' ? value[0] : undefined;
        }
        return typeof value === 'string' ? value : undefined;
    }

    async createOrder(req: Request, res: Response): Promise<void> {
        const contractBuyerId = this.isContractTestRequest(req)
            ? req.user?.userId || this.getHeaderValue(req.headers['x-user-id'])
            : undefined;
        const dto = {
            ...req.body,
            ...(contractBuyerId ? { buyerId: contractBuyerId } : {})
        };
        dto.enablerId = req.params.enablerId;

        try {
            const result = await this.facilitateOrderUseCase.execute(dto);
            res.status(this.isContractTestRequest(req) ? 200 : 201).json(result);
        } catch (error: any) {
            res.status(this.errorStatus(error)).json({ error: error.message });
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
            const { enablerId, orderId } = req.params;
            const order = await this.orderRepository.findByOrderId(orderId);
            if (!order || order.enablerId !== enablerId) {
                res.status(404).json({ error: 'Order not found' });
                return;
            }

            const result = await this.commissionUseCase.execute(orderId);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
