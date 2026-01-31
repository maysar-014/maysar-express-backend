import { Request, Response } from 'express';
import { GetSellerDashboard } from '../../application/use-cases/GetSellerDashboard';
import { GetSalesAnalytics } from '../../application/use-cases/GetSalesAnalytics';
import { GetSupplierAnalytics } from '../../application/use-cases/GetSupplierAnalytics';
import { GetCourierAnalytics } from '../../application/use-cases/GetCourierAnalytics';

export class AnalyticsController {
    constructor(
        private getSellerDashboard: GetSellerDashboard,
        private getSalesAnalytics: GetSalesAnalytics,
        private getSupplierAnalytics: GetSupplierAnalytics,
        private getCourierAnalytics: GetCourierAnalytics
    ) { }

    async getSellerDashboardHandler(req: Request, res: Response) {
        try {
            const result = await this.getSellerDashboard.execute(req.params.sellerId);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getSalesAnalyticsHandler(req: Request, res: Response) {
        try {
            const result = await this.getSalesAnalytics.execute(req.params.sellerId);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getSupplierAnalyticsHandler(req: Request, res: Response) {
        try {
            const result = await this.getSupplierAnalytics.execute(req.params.supplierId);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getCourierAnalyticsHandler(req: Request, res: Response) {
        try {
            const result = await this.getCourierAnalytics.execute(req.params.courierId);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
