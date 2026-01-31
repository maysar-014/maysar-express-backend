import { IEventBus } from '../../domain/interfaces/IEventBus';
import { SupplierAnalyticsRepository } from '../../infrastructure/repositories/SupplierAnalyticsRepository';
// SupplierEngine not used in original code for logic other than updating DB, so maybe redundant but kept if created. 
// I didn't create SupplierAnalyticsEngine because it wasn't in list of heavy logic, but maybe I should have. 
// The original code has logic in handlers directly updating DB.
// I will just use Repository here as mostly CRUD.

export class SupplierAnalyticsSaga {
    constructor(
        private eventBus: IEventBus,
        private repository: SupplierAnalyticsRepository
    ) {
        this.initialize();
    }

    private initialize() {
        this.eventBus.subscribe('ProductionResourcesAllocated', this.handleProductionResourcesAllocated.bind(this));
        this.eventBus.subscribe('QualityCertificateIssued', this.handleQualityCertificateIssued.bind(this));
        this.eventBus.subscribe('BulkOrderShipped', this.handleBulkOrderShipped.bind(this));
        this.eventBus.subscribe('SupplierPaymentConfirmed', this.handleSupplierPaymentConfirmed.bind(this));
        this.eventBus.subscribe('WholesalePricingPublished', this.handleWholesalePricingPublished.bind(this));
    }

    private async handleProductionResourcesAllocated(event: any) {
        const { supplierId, resources } = event.data || event;
        await this.repository.updateAnalytics(supplierId, {
            resourceUtilization: resources,
            lastUpdated: new Date()
        });
    }

    private async handleQualityCertificateIssued(event: any) {
        const { supplierId, batchId, certificateId } = event.data || event;
        await this.repository.updateAnalytics(supplierId, {
            qualityScore: 0.98,
            certificatesIssued: { increment: 1 }
        });
    }

    private async handleBulkOrderShipped(event: any) {
        const { supplierId, bulkOrderId, trackingNumber } = event.data || event;
        await this.repository.updateAnalytics(supplierId, {
            ordersShipped: { increment: 1 },
            lastShipment: new Date()
        });
    }

    private async handleSupplierPaymentConfirmed(event: any) {
        const { supplierId, amount } = event.data || event;
        await this.repository.updateAnalytics(supplierId, {
            totalRevenue: { increment: amount || 1000 },
            paymentsReceived: { increment: 1 }
        });
    }

    private async handleWholesalePricingPublished(event: any) {
        const { supplierId, products } = event.data || event;
        await this.repository.updateAnalytics(supplierId, {
            pricingUpdates: { increment: 1 },
            activeProducts: products.length
        });
    }
}
