import { IEventBus } from '../../domain/interfaces/IEventBus';
import { CourierAnalyticsEngine } from '../../domain/engines/CourierAnalyticsEngine';
import { CourierAnalyticsRepository } from '../../infrastructure/repositories/CourierAnalyticsRepository';

export class CourierAnalyticsSaga {
    constructor(
        private eventBus: IEventBus,
        private engine: CourierAnalyticsEngine,
        private repository: CourierAnalyticsRepository
    ) {
        this.initialize();
    }

    private initialize() {
        this.eventBus.subscribe('CourierMetricsCollected', this.handleCourierMetricsCollected.bind(this));
        this.eventBus.subscribe('PerformanceAnalysisCompleted', this.handlePerformanceAnalysisCompleted.bind(this));
        this.eventBus.subscribe('CourierEarningsUpdated', this.handleCourierEarningsUpdated.bind(this));
        this.eventBus.subscribe('PayoutScheduled', this.handlePayoutScheduled.bind(this));
        this.eventBus.subscribe('VehicleStatusUpdated', this.handleVehicleStatusUpdated.bind(this));
        this.eventBus.subscribe('CourierKYCStatusUpdated', this.handleCourierKYCStatusUpdated.bind(this));
    }

    private async handleCourierMetricsCollected(event: any) {
        const { courierId, sagaId, metrics } = event.data || event;
        if (!metrics) {
            throw new Error('Courier metrics payload is required for analytics.');
        }

        await this.eventBus.publish({
            type: 'PerformanceAnalysisCompleted',
            data: { courierId, analysis: metrics, sagaId }
        });
    }

    private async handlePerformanceAnalysisCompleted(event: any) {
        const { courierId, analysis, sagaId } = event.data || event;
        const report = this.engine.generatePerformanceReport(analysis);

        await this.repository.updateAnalytics(courierId, {
            performanceScore: analysis.efficiency,
            lastAnalysis: new Date()
        });

        await this.eventBus.publish({
            type: 'PerformanceReportGenerated',
            data: { courierId, report, sagaId }
        });
    }

    private async handleCourierEarningsUpdated(event: any) {
        const { courierId, deliveryId, earnings } = event.data || event;
        await this.repository.updateAnalytics(courierId, {
            totalEarnings: { increment: earnings },
            deliveriesCompleted: { increment: 1 },
            lastDelivery: new Date()
        });
    }

    private async handlePayoutScheduled(event: any) {
        const { courierId, totalEarnings } = event.data || event;
        await this.repository.updateAnalytics(courierId, {
            totalPayouts: { increment: totalEarnings },
            payoutsReceived: { increment: 1 }
        });
    }

    private async handleVehicleStatusUpdated(event: any) {
        const { courierId, vehicleId, status } = event.data || event;
        await this.repository.updateAnalytics(courierId, {
            vehicleStatus: status,
            lastVehicleUpdate: new Date()
        });
    }

    private async handleCourierKYCStatusUpdated(event: any) {
        const { courierId, verificationStatus } = event.data || event;
        await this.repository.updateAnalytics(courierId, {
            kycStatus: verificationStatus,
            kycCompletedAt: new Date()
        });
    }
}
