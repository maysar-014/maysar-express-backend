import { IEventBus } from '../../domain/interfaces/IEventBus';
import { SellerAnalyticsEngine } from '../../domain/engines/SellerAnalyticsEngine';
import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';

export class SellerAnalyticsSaga {
    constructor(
        private eventBus: IEventBus,
        private engine: SellerAnalyticsEngine,
        private repository: SellerAnalyticsRepository
    ) {
        this.initialize();
    }

    private initialize() {
        this.eventBus.subscribe('MetricsCollectionRequested', this.handleMetricsCollectionRequested.bind(this));
        this.eventBus.subscribe('SellerMetricsCollected', this.handleSellerMetricsCollected.bind(this));
        this.eventBus.subscribe('SellerKPIsCalculated', this.handleSellerKPIsCalculated.bind(this));
        this.eventBus.subscribe('RealTimeDataUpdated', this.handleRealTimeDataUpdated.bind(this));

        this.eventBus.subscribe('SalesDataCollectionRequested', this.handleSalesDataCollectionRequested.bind(this));
        this.eventBus.subscribe('SalesDataCollected', this.handleSalesDataCollected.bind(this));
        this.eventBus.subscribe('TrendAnalysisCompleted', this.handleTrendAnalysisCompleted.bind(this));
        this.eventBus.subscribe('SalesReportGenerated', this.handleSalesReportGenerated.bind(this));
        this.eventBus.subscribe('InsightsExtracted', this.handleInsightsExtracted.bind(this));

        this.eventBus.subscribe('PerformanceDataCollectionRequested', this.handlePerformanceDataCollectionRequested.bind(this));
        this.eventBus.subscribe('PerformanceDataCollected', this.handlePerformanceDataCollected.bind(this));
        this.eventBus.subscribe('BenchmarkComparisonCompleted', this.handleBenchmarkComparisonCompleted.bind(this));
        this.eventBus.subscribe('PerformanceAlertsGenerated', this.handlePerformanceAlertsGenerated.bind(this));
    }

    // --- Metrics Flow ---

    private async handleMetricsCollectionRequested(event: any) {
        const { sellerId, dateRange, sagaId, metrics } = event.data || event;
        if (!metrics) {
            throw new Error('Seller metrics payload is required for analytics.');
        }

        await this.eventBus.publish({
            type: 'SellerMetricsCollected', // Bridging to the "Collected" event
            data: { sellerId, metrics, timeRange: dateRange, sagaId }
        });
    }

    private async handleSellerMetricsCollected(event: any) {
        const { sellerId, metrics, sagaId } = event.data || event;
        const kpis = this.engine.calculateKPIs(metrics);

        await this.eventBus.publish({
            type: 'SellerKPIsCalculated',
            data: { sellerId, kpis, calculatedAt: new Date(), sagaId }
        });
    }

    private async handleSellerKPIsCalculated(event: any) {
        const { sellerId, kpis, sagaId, realTimeData } = event.data || event;
        if (!realTimeData) {
            throw new Error('Real-time data payload is required to update seller dashboard.');
        }

        await this.eventBus.publish({
            type: 'RealTimeDataUpdated',
            data: { sellerId, realTimeData, timestamp: new Date(), sagaId }
        });
    }

    private async handleRealTimeDataUpdated(event: any) {
        const { sellerId, realTimeData, sagaId } = event.data || event;
        await this.repository.updateMetrics(sellerId, {
            // Mapping realTimeData to DB schema fields if they exist, 
            // or just updating timestamp as per original 'SellerDashboardUpdated'
            // Original: await updateDashboard(sellerId, realTimeData);
        });

        await this.eventBus.publish({
            type: 'SellerDashboardUpdated',
            data: { sellerId, updatedAt: new Date(), sagaId }
        });
    }

    // --- Sales Flow ---

    private async handleSalesDataCollectionRequested(event: any) {
        const { sellerId, sagaId, salesData } = event.data || event;
        if (!salesData) {
            throw new Error('Sales data payload is required for trend analysis.');
        }

        await this.eventBus.publish({
            type: 'SalesDataCollected',
            data: { sellerId, salesData, sagaId }
        });
    }

    private async handleSalesDataCollected(event: any) {
        const { sellerId, salesData, sagaId } = event.data || event;
        const trends = this.engine.analyzeSalesTrends(salesData);

        await this.eventBus.publish({
            type: 'TrendAnalysisCompleted',
            data: { sellerId, trends, analyzedAt: new Date(), sagaId }
        });
    }

    private async handleTrendAnalysisCompleted(event: any) {
        const { sellerId, trends, sagaId, reportUrl, reportId } = event.data || event;
        if (!reportUrl || !reportId) {
            throw new Error('Sales report generation requires reportUrl and reportId.');
        }

        await this.eventBus.publish({
            type: 'SalesReportGenerated',
            data: { sellerId, reportId, reportUrl, generatedAt: new Date(), sagaId }
        });
    }

    private async handleSalesReportGenerated(event: any) {
        const { sellerId, sagaId, insights } = event.data || event;
        if (!insights) {
            throw new Error('Insights payload is required to update sales analytics.');
        }

        await this.eventBus.publish({
            type: 'InsightsExtracted',
            data: { sellerId, insights, extractedAt: new Date(), sagaId }
        });
    }

    private async handleInsightsExtracted(event: any) {
        const { sellerId, insights, sagaId } = event.data || event;
        await this.repository.saveSalesAnalytics(sellerId, insights);

        await this.eventBus.publish({
            type: 'AnalyticsDashboardUpdated',
            data: { sellerId, updatedAt: new Date(), sagaId }
        });
    }

    // --- Performance Flow ---

    private async handlePerformanceDataCollectionRequested(event: any) {
        const { sellerId, sagaId, performanceData } = event.data || event;
        if (!performanceData) {
            throw new Error('Performance data payload is required for benchmark analysis.');
        }

        await this.eventBus.publish({
            type: 'PerformanceDataCollected',
            data: { sellerId, performanceData, sagaId }
        });
    }

    private async handlePerformanceDataCollected(event: any) {
        const { sellerId, performanceData, sagaId } = event.data || event;
        const benchmarks = this.engine.generateBenchmarks(performanceData);

        await this.eventBus.publish({
            type: 'BenchmarkComparisonCompleted',
            data: { sellerId, benchmarks, comparedAt: new Date(), sagaId }
        });
    }

    private async handleBenchmarkComparisonCompleted(event: any) {
        const { sellerId, benchmarks, sagaId } = event.data || event;
        const alerts = this.engine.generatePerformanceAlerts(benchmarks);

        await this.eventBus.publish({
            type: 'PerformanceAlertsGenerated',
            data: { sellerId, alerts, generatedAt: new Date(), sagaId }
        });
    }

    private async handlePerformanceAlertsGenerated(event: any) {
        const { sellerId, sagaId, recommendations } = event.data || event;
        if (!recommendations) {
            throw new Error('Recommendations payload is required to complete performance workflow.');
        }

        await this.eventBus.publish({
            type: 'RecommendationsGenerated',
            data: { sellerId, recommendations, generatedAt: new Date(), sagaId }
        });
    }
}
