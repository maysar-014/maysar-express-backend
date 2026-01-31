import { IEventBus } from '../../domain/interfaces/IEventBus';
import { EnablerAnalyticsEngine } from '../../domain/engines/EnablerAnalyticsEngine';
import { EnablerAnalyticsRepository } from '../../infrastructure/repositories/EnablerAnalyticsRepository';

export class EnablerAnalyticsSaga {
    constructor(
        private eventBus: IEventBus,
        private engine: EnablerAnalyticsEngine,
        private repository: EnablerAnalyticsRepository
    ) {
        this.initialize();
    }

    private initialize() {
        this.eventBus.subscribe('PerformanceMetricsCollected', this.handlePerformanceMetricsCollected.bind(this));
        this.eventBus.subscribe('KPIAnalysisCompleted', this.handleKPIAnalysisCompleted.bind(this));
        this.eventBus.subscribe('TrainingScheduled', this.handleTrainingScheduled.bind(this));
        this.eventBus.subscribe('TrainingCertificateIssued', this.handleTrainingCertificateIssued.bind(this));
        this.eventBus.subscribe('SellerOnboardingCompleted', this.handleSellerOnboardingCompleted.bind(this));
        this.eventBus.subscribe('LogisticsSolutionImplemented', this.handleLogisticsSolutionImplemented.bind(this));
        this.eventBus.subscribe('SalesOutcomeTracked', this.handleSalesOutcomeTracked.bind(this));
        this.eventBus.subscribe('SkillCertificationsIssued', this.handleSkillCertificationsIssued.bind(this));
    }

    private async handlePerformanceMetricsCollected(event: any) {
        const { enablerId, metrics, sagaId } = event.data || event;
        const kpiAnalysis = this.engine.calculateKPIAnalysis(metrics);

        await this.eventBus.publish({
            type: 'KPIAnalysisCompleted',
            data: { enablerId, kpiAnalysis, overallScore: kpiAnalysis.overallScore, sagaId }
        });
    }

    private async handleKPIAnalysisCompleted(event: any) {
        const { enablerId, kpiAnalysis, sagaId } = event.data || event;
        const improvementPlan = this.engine.createImprovementPlan(kpiAnalysis);

        await this.eventBus.publish({
            type: 'ImprovementPlanCreated',
            data: { enablerId, improvementPlan, sagaId }
        });
    }

    private async handleTrainingScheduled(event: any) {
        const { enablerId, sellerId, trainingModule } = event.data || event;
        await this.repository.updateAnalytics(enablerId, {
            trainingsScheduled: { increment: 1 },
            lastTrainingDate: new Date()
        });
    }

    private async handleTrainingCertificateIssued(event: any) {
        const { enablerId, sellerId } = event.data || event;
        await this.repository.updateAnalytics(enablerId, {
            certificatesIssued: { increment: 1 },
            sellersOnboarded: { increment: 1 }
        });
    }

    private async handleSellerOnboardingCompleted(event: any) {
        const { enablerId, sellerId } = event.data || event;
        await this.repository.updateAnalytics(enablerId, {
            sellersOnboarded: { increment: 1 },
            totalEarnings: { increment: 50 },
            lastActivity: new Date()
        });
    }

    private async handleLogisticsSolutionImplemented(event: any) {
        const { enablerId, solutionResult } = event.data || event;
        await this.repository.updateAnalytics(enablerId, {
            supportTicketsResolved: { increment: 1 },
            successRate: solutionResult.success ? 0.95 : 0.85
        });
    }

    private async handleSalesOutcomeTracked(event: any) {
        const { enablerId, outcome, saleValue } = event.data || event;
        await this.repository.updateAnalytics(enablerId, {
            salesSupported: { increment: 1 },
            totalSalesValue: { increment: saleValue || 0 },
            conversionRate: outcome === 'sale' ? 0.75 : 0.65
        });
    }

    private async handleSkillCertificationsIssued(event: any) {
        const { enablerId, certifications } = event.data || event;
        await this.repository.updateAnalytics(enablerId, {
            skillCertifications: { increment: certifications.length },
            skillLevel: 'advanced'
        });
    }
}
