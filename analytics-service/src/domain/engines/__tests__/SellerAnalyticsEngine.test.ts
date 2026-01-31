import { SellerAnalyticsEngine } from '../SellerAnalyticsEngine';
import { SellerKPIs, SalesTrend, SalesReport, BenchmarkComparison, PerformanceAnalysis } from '../../types';

describe('SellerAnalyticsEngine', () => {
    let engine: SellerAnalyticsEngine;

    beforeEach(() => {
        engine = new SellerAnalyticsEngine();
    });

    describe('calculateKPIs', () => {
        it('should calculate KPIs correctly with valid metrics', () => {
            const metrics = {
                totalRevenue: 500000,
                totalOrders: 1000
            };

            const kpis = engine.calculateKPIs(metrics);

            expect(kpis.revenueGrowth).toBe((500000 / 100000) * 0.2); // 5 * 0.2 = 1.0
            expect(kpis.orderGrowth).toBe((1000 / 5000) * 0.15); // 0.2 * 0.15 = 0.03
            expect(kpis.customerRetention).toBe(0.75);
            expect(kpis.profitMargin).toBe(0.2);
            expect(kpis.averageOrderValue).toBe(140.63);
        });

        it('should handle missing revenue metrics', () => {
            const metrics = {
                totalOrders: 1000
            };

            const kpis = engine.calculateKPIs(metrics);

            expect(kpis.revenueGrowth).toBe(0.15);
            expect(kpis.orderGrowth).toBe((1000 / 5000) * 0.15);
        });

        it('should handle missing orders metrics', () => {
            const metrics = {
                totalRevenue: 500000
            };

            const kpis = engine.calculateKPIs(metrics);

            expect(kpis.revenueGrowth).toBe(1.0);
            expect(kpis.orderGrowth).toBe(0.1);
        });

        it('should handle empty metrics object', () => {
            const kpis = engine.calculateKPIs({});

            expect(kpis.revenueGrowth).toBe(0.15);
            expect(kpis.orderGrowth).toBe(0.1);
        });
    });

    describe('analyzeSalesTrends', () => {
        it('should return a valid SalesTrend object', () => {
            const trends: SalesTrend = engine.analyzeSalesTrends([]);

            expect(trends.revenueTrend).toBe('increasing');
            expect(trends.orderTrend).toBe('stable');
            expect(trends.seasonality).toBe('moderate');
            expect(trends.seasonalPatterns).toContain('peak_december');
            expect(trends.customerBehavior?.repeatPurchaseRate).toBe(35.2);
        });
    });

    describe('extractInsights', () => {
        it('should extract insights from reports', () => {
            const insights = engine.extractInsights({} as SalesReport);

            expect(insights).toHaveLength(4);
            expect(insights[0].type).toBe('opportunity');
            expect(insights[0].priority).toBe('high');
            expect(insights[1].type).toBe('warning');
        });
    });

    describe('analyzePerformance', () => {
        it('should analyze performance data', () => {
            const analysis = engine.analyzePerformance({});

            expect(analysis.overall).toBe('good');
            expect(analysis.bottlenecks).toContain('database_queries');
            expect(analysis.improvements).toContain('cache_optimization');
        });
    });

    describe('generateRecommendations', () => {
        it('should generate recommendations based on analysis', () => {
            const analysis: PerformanceAnalysis = {
                overall: 'good',
                bottlenecks: [],
                improvements: []
            };

            const recommendations = engine.generateRecommendations(analysis);

            expect(recommendations.length).toBeGreaterThan(0);
            expect(recommendations[0].category).toBe('efficiency');
            expect(recommendations[0].action).toContain('automating order processing');
        });
    });

    describe('generateBenchmarks', () => {
        it('should generate benchmarks', () => {
            const benchmarks = engine.generateBenchmarks({});

            expect(benchmarks.sellerRanking).toBe('top_25_percent');
            expect(benchmarks.industryAverage.responseTime).toBe(2.1);
        });
    });

    describe('generatePerformanceAlerts', () => {
        it('should generate alerts from benchmarks', () => {
            const benchmarks: BenchmarkComparison = {
                industryAverage: {
                    responseTime: 2.1,
                    fulfillmentTime: 48,
                    satisfaction: 4.0,
                    returnRate: 3.5
                },
                sellerRanking: 'top_25_percent'
            };

            const alerts = engine.generatePerformanceAlerts(benchmarks);

            expect(alerts).toHaveLength(1);
            expect(alerts[0].type).toBe('performance');
            expect(alerts[0].severity).toBe('low');
        });
    });

    describe('generateSalesReport', () => {
        it('should generate a sales report', () => {
            // Mock input as SalesTrend since that's what the signature expects
            const trends = {
                revenueTrend: 'increasing',
                orderTrend: 'stable',
                customerTrend: 'increasing',
                seasonality: 'moderate'
            } as SalesTrend;

            const report = engine.generateSalesReport(trends);

            expect(report.monthlySummary.revenue).toBe(45000);
            expect(report.topProducts).toHaveLength(3);
            expect(report.customerSegments.new).toBe(0.3);
        });
    });
});
