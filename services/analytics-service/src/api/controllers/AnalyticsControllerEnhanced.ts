import { Router, Request, Response } from 'express';
import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';
import { GetSellerProfitabilityDashboard } from '../../application/use-cases/GetSellerProfitabilityDashboard';
import { GetRevenueHealthMetrics } from '../../application/use-cases/GetRevenueHealthMetrics';
import { GetGrowthIndicators } from '../../application/use-cases/GetGrowthIndicators';
import { GetRetentionMetrics } from '../../application/use-cases/GetRetentionMetrics';
import { GetFinancialMetrics } from '../../application/use-cases/GetFinancialMetrics';
import { GetHappinessSignals } from '../../application/use-cases/GetHappinessSignals';
import { GetFounderOperatingSystemDashboard } from '../../application/use-cases/GetFounderOperatingSystemDashboard';
import { RevenueHealthEngine } from '../../domain/engines/RevenueHealthEngine';
import { GrowthIndicatorsEngine } from '../../domain/engines/GrowthIndicatorsEngine';
import { RetentionEngine } from '../../domain/engines/RetentionEngine';
import { FinancialMetricsEngine } from '../../domain/engines/FinancialMetricsEngine';
import { SellerHappinessEngine } from '../../domain/engines/SellerHappinessEngine';
import { RedFlagEngine } from '../../domain/engines/RedFlagEngine';

export class AnalyticsController {
    private repository: SellerAnalyticsRepository;
    private revenueHealthEngine: RevenueHealthEngine;
    private growthIndicatorsEngine: GrowthIndicatorsEngine;
    private retentionEngine: RetentionEngine;
    private financialMetricsEngine: FinancialMetricsEngine;
    private sellerHappinessEngine: SellerHappinessEngine;
    private redFlagEngine: RedFlagEngine;

    constructor() {
        this.repository = new SellerAnalyticsRepository();
        this.revenueHealthEngine = new RevenueHealthEngine();
        this.growthIndicatorsEngine = new GrowthIndicatorsEngine();
        this.retentionEngine = new RetentionEngine();
        this.financialMetricsEngine = new FinancialMetricsEngine();
        this.sellerHappinessEngine = new SellerHappinessEngine();
        this.redFlagEngine = new RedFlagEngine();
    }

    async getSellerProfitabilityDashboard(req: Request, res: Response) {
        try {
            const { sellerId } = req.params;
            const revenueHealthUseCase = new GetRevenueHealthMetrics(this.repository, this.revenueHealthEngine);
            const growthIndicatorsUseCase = new GetGrowthIndicators(this.repository, this.growthIndicatorsEngine);
            const retentionMetricsUseCase = new GetRetentionMetrics(this.repository, this.retentionEngine);
            const financialMetricsUseCase = new GetFinancialMetrics(this.repository, this.financialMetricsEngine);
            const happinessSignalsUseCase = new GetHappinessSignals(this.repository, this.sellerHappinessEngine);

            const useCase = new GetSellerProfitabilityDashboard(
                this.repository,
                revenueHealthUseCase,
                growthIndicatorsUseCase,
                retentionMetricsUseCase,
                financialMetricsUseCase,
                happinessSignalsUseCase
            );

            const dashboard = await useCase.execute(sellerId);
            res.json(dashboard);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch dashboard' });
        }
    }

    async getRevenueHealth(req: Request, res: Response) {
        try {
            const { timeWindow = 'monthly' } = req.query;
            const useCase = new GetRevenueHealthMetrics(this.repository, this.revenueHealthEngine);
            const metrics = await useCase.execute(timeWindow as 'weekly' | 'monthly');
            res.json(metrics);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch revenue health metrics' });
        }
    }

    async getGrowthIndicators(req: Request, res: Response) {
        try {
            const useCase = new GetGrowthIndicators(this.repository, this.growthIndicatorsEngine);
            const metrics = await useCase.execute();
            res.json(metrics);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch growth indicators' });
        }
    }

    async getRetentionMetrics(req: Request, res: Response) {
        try {
            const useCase = new GetRetentionMetrics(this.repository, this.retentionEngine);
            const metrics = await useCase.execute();
            res.json(metrics);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch retention metrics' });
        }
    }

    async getFinancialMetrics(req: Request, res: Response) {
        try {
            const useCase = new GetFinancialMetrics(this.repository, this.financialMetricsEngine);
            const metrics = await useCase.execute();
            res.json(metrics);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch financial metrics' });
        }
    }

    async getHappinessSignals(req: Request, res: Response) {
        try {
            const useCase = new GetHappinessSignals(this.repository, this.sellerHappinessEngine);
            const metrics = await useCase.execute();
            res.json(metrics);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch happiness signals' });
        }
    }

    async getRedFlags(req: Request, res: Response) {
        try {
            const revenueHealthUseCase = new GetRevenueHealthMetrics(this.repository, this.revenueHealthEngine);
            const retentionMetricsUseCase = new GetRetentionMetrics(this.repository, this.retentionEngine);
            const financialMetricsUseCase = new GetFinancialMetrics(this.repository, this.financialMetricsEngine);
            const growthIndicatorsUseCase = new GetGrowthIndicators(this.repository, this.growthIndicatorsEngine);

            const revenueHealth = await revenueHealthUseCase.execute('monthly');
            const retention = await retentionMetricsUseCase.execute();
            const financial = await financialMetricsUseCase.execute();
            const growth = await growthIndicatorsUseCase.execute();

            const flags = this.redFlagEngine.detectRedFlags({
                churnRateMonthly: retention.churnRateMonthly,
                medianRevenue: revenueHealth.medianRevenue,
                arpsMonthly: revenueHealth.arpsMonthly,
                payoutTimeHours: financial.avgPayoutTimeHours,
                disputesPer100Orders: financial.disputesPer100Orders,
                retentionRate90Days: retention.retentionRate90Days,
                productExpansionRate: 0 // Would need to calculate from happiness signals
            });

            res.json({ flags, timestamp: new Date() });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch red flags' });
        }
    }

    async getFounderOperatingSystem(_req: Request, res: Response) {
        try {
            const revenueHealthUseCase = new GetRevenueHealthMetrics(this.repository, this.revenueHealthEngine);
            const growthIndicatorsUseCase = new GetGrowthIndicators(this.repository, this.growthIndicatorsEngine);
            const retentionMetricsUseCase = new GetRetentionMetrics(this.repository, this.retentionEngine);
            const financialMetricsUseCase = new GetFinancialMetrics(this.repository, this.financialMetricsEngine);
            const happinessSignalsUseCase = new GetHappinessSignals(this.repository, this.sellerHappinessEngine);

            const useCase = new GetFounderOperatingSystemDashboard(
                this.repository,
                revenueHealthUseCase,
                growthIndicatorsUseCase,
                retentionMetricsUseCase,
                financialMetricsUseCase,
                happinessSignalsUseCase,
                this.redFlagEngine
            );

            const dashboard = await useCase.execute();
            res.json(dashboard);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch founder operating system dashboard' });
        }
    }
}
