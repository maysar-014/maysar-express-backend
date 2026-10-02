import { Request, Response } from 'express';
import { GetSellerDashboardEnhanced } from '../../application/use-cases/GetSellerDashboardEnhanced';
import { GenerateActionCenter } from '../../application/use-cases/GenerateActionCenter';
import { GenerateSalesTrend } from '../../application/use-cases/GenerateSalesTrend';
import { CalculateProfitabilityScore } from '../../application/use-cases/CalculateProfitabilityScore';
import prisma from '../../infrastructure/database/prisma';

export class SellerDashboardController {
  async getSellerDashboard(req: Request, res: Response) {
    try {
      const { sellerId } = req.params;
      const useCase = new GetSellerDashboardEnhanced();
      const dashboard = await useCase.execute(sellerId);
      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }

  async getMoneySnapshot(req: Request, res: Response) {
    try {
      const { sellerId } = req.params;
      const useCase = new GetSellerDashboardEnhanced();
      const dashboard = await useCase.execute(sellerId);
      res.json(dashboard.moneySnapshot);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch money snapshot' });
    }
  }

  async getActionCenter(req: Request, res: Response) {
    try {
      const { sellerId } = req.params;
      const actions = await prisma.analytics_SellerActionItem.findMany({
        where: { sellerId, isResolved: false },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
      });
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch action center' });
    }
  }

  async getSalesTrend(req: Request, res: Response) {
    try {
      const { sellerId } = req.params;
      const useCase = new GenerateSalesTrend();
      const trend = await useCase.execute(sellerId);
      res.json(trend);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sales trend' });
    }
  }

  async getProfitabilityScore(req: Request, res: Response) {
    try {
      const { sellerId } = req.params;
      const useCase = new CalculateProfitabilityScore();
      const breakdown = await useCase.execute(sellerId);
      res.json({
        score: breakdown.total,
        breakdown: {
          salesGrowth: Math.round(breakdown.salesGrowth),
          repeatBuyers: Math.round(breakdown.repeatBuyers),
          responseTime: Math.round(breakdown.responseTime),
          orderCompletion: Math.round(breakdown.orderCompletion),
          inventoryStability: Math.round(breakdown.inventoryStability)
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch profitability score' });
    }
  }

  async resolveActionItem(req: Request, res: Response) {
    try {
      const { actionId } = req.params;
      await prisma.analytics_SellerActionItem.update({
        where: { id: actionId },
        data: { isResolved: true }
      });
      res.json({ success: true });
    } catch (error) {
      // Prisma P2025 = "record to update not found" → the action item does not exist
      const code = (error as { code?: string })?.code
        ?? (error as { meta?: { cause?: string } })?.meta?.cause;
      if (code === 'P2025' || String((error as Error)?.message || '').includes('Record to update not found')) {
        res.status(404).json({ success: false, error: 'Action item not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to resolve action item' });
    }
  }
}
