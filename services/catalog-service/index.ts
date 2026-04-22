import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';
import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';
import { eventBus } from '../../shared/events/eventBus';
import { initializeEventRegistry } from '../../shared/events/registry';
import type { DistributedSagaOrchestrator } from '../../shared/saga/saga.orchestrator';
import { createCampaignRoutes } from './src/campaigns/api/routes/campaign.routes';
import { container } from './src/campaigns/container';
import { TYPES } from './src/campaigns/types';
import { sagaLogRepository } from './src/campaigns/infrastructure/repositories/saga.repository';
import { createSagaFactory } from './src/application/sagas/saga-factory';
import pricingRoutes from './src/pricing/api/routes/pricing.routes';
import { healthRoutes as pricingHealthRoutes } from './src/pricing/api/routes/health.routes';
import { createProductRoutes } from './src/api/routes/product.routes';
import { createSearchRoutes } from './src/api/routes/search.routes';
import { MatchingRoutes } from './src/api/routes/matching.routes';
import { BuyBoxRoutes } from './src/api/routes/buy-box.routes';
import { createSellerStorefrontRoutes } from './src/api/routes/seller-storefront.routes';
import { createPricingRoutes as createCatalogPricingRoutes } from './src/api/routes/pricing.routes';
import { createHealthRoutes as createCatalogHealthRoutes } from './src/api/routes/health.routes';
import { createMaintenanceRoutes as createCatalogMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { ProductControllerFactory } from './src/api/controllers/product.controller';
import { SearchController } from './src/api/controllers/search.controller';
import { ProductMatchingController } from './src/api/controllers/product-matching.controller';
import { BuyBoxController } from './src/api/controllers/buy-box.controller';
import { SellerStorefrontController } from './src/api/controllers/seller-storefront.controller';
import { PricingController } from './src/api/controllers/pricing.controller';
import { ProductMapper } from './src/application/mappers/product-mapper';
import { CreateProductUseCase } from './src/application/use-cases/create-product.use-case';
import { GetProductUseCase, GetProductsBySellerUseCase } from './src/application/use-cases/get-product.use-case';
import { SearchProductsUseCase } from './src/application/use-cases/search-products.use-case';
import { LoadCategoryAttributesUseCase } from './src/application/use-cases/load-category-attributes.use-case';
import { PreviewGeneratedDescriptionUseCase } from './src/application/use-cases/preview-generated-description.use-case';
import {
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase
} from './src/application/use-cases/manage-categories.use-case';
import { CreateProductWithMatchingUseCase } from './src/application/use-cases/create-product-with-matching.use-case';
import { MatchProductUseCase } from './src/application/use-cases/match-product.use-case';
import { ConfirmProductMatchUseCase } from './src/application/use-cases/confirm-product-match.use-case';
import { ComputeBuyBoxUseCase } from './src/application/use-cases/compute-buy-box.use-case';
import { PrismaProductRepository } from './src/infrastructure/repositories/prisma-product.repository';
import { PrismaCategoryAttributeRepository } from './src/infrastructure/repositories/prisma-category-attribute.repository';
import { PrismaProductAttributeRepository } from './src/infrastructure/repositories/prisma-product-attribute.repository';
import { PrismaProductMatchAuditRepository } from './src/infrastructure/repositories/prisma-product-match-audit.repository';
import { PrismaMatchConfirmationRepository } from './src/infrastructure/repositories/prisma-match-confirmation.repository';
import { PrismaBuyBoxRepository } from './src/infrastructure/repositories/prisma-buy-box.repository';
import { EventPublisherFactory } from './src/infrastructure/messaging/event-publisher';
import { BuyBoxWeights } from './src/domain/value-objects/buy-box-weights.value-object';
import { BuyBoxEventPublisher } from './src/infrastructure/messaging/buy-box-event-publisher';
import { CatalogOutboxRepository } from './src/infrastructure/messaging/catalog-outbox.repository';
import { externalServicesConfig } from './src/config/external-services.config';
import { SearchHealthMonitor, SearchProviderFactory, SearchConfig } from './src/infrastructure/providers/search.provider';
import { MeilisearchSearchService } from './src/infrastructure/services/search.service';
import type { CategoryRepository, MediaRepository, SearchService, IdGenerator, DateTimeService } from './src/domain/interfaces';
import { createPrismaClient } from '@shared/database/prisma-client';
import { getModelPrefix, isSystemId, makeId } from '@shared/ids/id';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';

class PrismaCategoryRepository implements CategoryRepository {
    constructor(private readonly client: PrismaClient) {}

    async save(category: any): Promise<any> {
        if (!category.id) {
            return this.client.category.create({ data: category });
        }

        return this.client.category.upsert({
            where: { id: category.id },
            create: category,
            update: category
        });
    }

    async findById(id: string): Promise<any | null> {
        return this.client.category.findUnique({ where: { id } });
    }

    async findAll(): Promise<any[]> {
        return this.client.category.findMany({
            orderBy: [
                { displayOrder: 'asc' },
                { name: 'asc' }
            ]
        });
    }

    async findBySlug(slug: string): Promise<any | null> {
        return this.client.category.findUnique({ where: { slug } });
    }

    async findSubcategories(parentId: string): Promise<any[]> {
        return this.client.category.findMany({ where: { parentId } });
    }

    async update(id: string, updates: any): Promise<any> {
        return this.client.category.update({ where: { id }, data: updates });
    }

    async delete(id: string): Promise<boolean> {
        await this.client.category.delete({ where: { id } });
        return true;
    }
}

class PrismaMediaRepository implements MediaRepository {
    constructor(private readonly client: PrismaClient) {}

    async save(media: any): Promise<any> {
        return this.client.mediaRef.create({ data: media });
    }

    async findById(id: string): Promise<any | null> {
        return this.client.mediaRef.findUnique({ where: { id } });
    }

    async findByProduct(productId: string): Promise<any[]> {
        return this.client.mediaRef.findMany({
            where: { entityId: productId },
            orderBy: { displayOrder: 'asc' }
        });
    }

    async delete(id: string): Promise<boolean> {
        await this.client.mediaRef.delete({ where: { id } });
        return true;
    }

    async updateMetadata(id: string, metadata: any): Promise<any> {
        return this.client.mediaRef.update({ where: { id }, data: { metadata } });
    }
}

class PrismaSearchService implements SearchService {
    constructor(private readonly client: PrismaClient) {}

    async index(_document: any): Promise<void> { return; }

    async search(query: string, filters: any, pagination: any): Promise<any> {
        const where: any = {};
        if (query) { where.title = { contains: query, mode: 'insensitive' }; }
        if (filters?.category) { where.categoryId = filters.category; }
        if (filters?.seller) { where.sellerId = filters.seller; }
        if (filters?.excludeProduct) { where.id = { not: filters.excludeProduct }; }

        const products = await this.client.product.findMany({
            where,
            include: { variants: true },
            take: pagination?.limit || 20,
            skip: pagination?.offset || 0
        });

        return products.map(product => ({
            id: product.id,
            name: product.title,
            description: product.description,
            price: {
                amount: product.variants?.[0]?.price ? Number(product.variants[0].price) : 0,
                currency: 'USD'
            },
            categoryId: product.categoryId,
            sellerId: product.sellerId,
            type: 'physical',
            tags: [],
            status: product.status,
            createdAt: new Date()
        }));
    }

    async remove(_id: string): Promise<void> { return; }
    async update(_id: string, _updates: any): Promise<void> { return; }
}

const idGenerator: IdGenerator = {
    generate: () => makeId('evt'),
    validate: (id: string) => isSystemId(id)
};

const dateTimeService: DateTimeService = {
    now: () => new Date(),
    timestamp: () => Date.now(),
    add: (date: Date, amount: number, unit: string) => {
        const ms = unit === 'days'
            ? amount * 24 * 60 * 60 * 1000
            : unit === 'hours'
                ? amount * 60 * 60 * 1000
                : unit === 'minutes'
                    ? amount * 60 * 1000
                    : amount * 1000;
        return new Date(date.getTime() + ms);
    },
    isPast: (date: Date) => date.getTime() < Date.now(),
    format: (date: Date, _format: string) => date.toISOString()
};

let outboxProcessor: OutboxProcessor | null = null;

export const CatalogModule: Module = {
    name: 'catalog-service',
    initialize: async () => {
        logger.info('Initializing catalog-service module (fully merged)');

        const prisma = createPrismaClient();

        // Wire dependency graph
        const productRepository = new PrismaProductRepository(prisma);
        const categoryRepository = new PrismaCategoryRepository(prisma);
        const categoryAttributeRepository = new PrismaCategoryAttributeRepository(prisma);
        const productAttributeRepository = new PrismaProductAttributeRepository(prisma);
        const mediaRepository = new PrismaMediaRepository(prisma);
        const fallbackSearchService = new PrismaSearchService(prisma);
        const searchConfig: SearchConfig = {
            provider: externalServicesConfig.search.provider,
            indexName: externalServicesConfig.search.meilisearch?.indexName || 'catalog',
            timeout: externalServicesConfig.search.meilisearch?.requestTimeout || 30000,
            apiKey: externalServicesConfig.search.meilisearch?.apiKey,
            host: externalServicesConfig.search.meilisearch?.host,
            port: externalServicesConfig.search.meilisearch?.port,
            protocol: externalServicesConfig.search.meilisearch?.protocol,
            meilisearch: externalServicesConfig.search.meilisearch ? {
                host: externalServicesConfig.search.meilisearch.host,
                port: externalServicesConfig.search.meilisearch.port,
                protocol: externalServicesConfig.search.meilisearch.protocol,
                apiKey: externalServicesConfig.search.meilisearch.apiKey,
                indexName: externalServicesConfig.search.meilisearch.indexName,
                requestTimeout: externalServicesConfig.search.meilisearch.requestTimeout
            } : undefined
        };
        const searchProvider = SearchProviderFactory.createDefault(searchConfig);
        const searchHealthMonitor = new SearchHealthMonitor(searchProvider);
        const searchService: SearchService = externalServicesConfig.search.enabled
            ? new MeilisearchSearchService(searchProvider, {
                indexName: searchConfig.indexName || 'catalog',
                fallback: fallbackSearchService
            })
            : fallbackSearchService;
        const catalogOutboxRepository = new CatalogOutboxRepository(prisma);
        const eventPublisher = EventPublisherFactory.createDefault(
            {},
            idGenerator,
            dateTimeService,
            catalogOutboxRepository
        );

        const createProductUseCase = new CreateProductUseCase(
            productRepository,
            categoryRepository,
            categoryAttributeRepository,
            productAttributeRepository,
            eventPublisher,
            idGenerator,
            dateTimeService
        );
        const getProductUseCase = new GetProductUseCase(productRepository, mediaRepository, searchService);
        const getProductsBySellerUseCase = new GetProductsBySellerUseCase(productRepository);
        const searchProductsUseCase = new SearchProductsUseCase(productRepository, categoryRepository, searchService);
        const loadCategoryAttributesUseCase = new LoadCategoryAttributesUseCase(
            categoryAttributeRepository,
            categoryRepository
        );
        const previewGeneratedDescriptionUseCase = new PreviewGeneratedDescriptionUseCase({
            findCategoryById: (categoryId: string) => categoryRepository.findById(categoryId),
            findCategoryAttributesByCategory: (categoryId: string) => categoryAttributeRepository.findByCategory(categoryId)
        });
        const listCategoriesUseCase = new ListCategoriesUseCase(categoryRepository);
        const createCategoryUseCase = new CreateCategoryUseCase(categoryRepository);
        const updateCategoryUseCase = new UpdateCategoryUseCase(categoryRepository);
        const deleteCategoryUseCase = new DeleteCategoryUseCase(categoryRepository, productRepository);

        const productMapper = new ProductMapper();
        const matchAuditRepository = new PrismaProductMatchAuditRepository(prisma);
        const matchConfirmationRepository = new PrismaMatchConfirmationRepository(prisma);
        const matchProductUseCase = new MatchProductUseCase(
            productRepository as any,
            matchAuditRepository,
            matchConfirmationRepository
        );
        const confirmMatchUseCase = new ConfirmProductMatchUseCase(
            matchConfirmationRepository,
            matchAuditRepository
        );
        const createProductWithMatchingUseCase = new CreateProductWithMatchingUseCase(
            matchProductUseCase,
            productRepository as any
        );

        const productController = ProductControllerFactory.create(
            createProductUseCase,
            getProductUseCase,
            getProductsBySellerUseCase,
            searchProductsUseCase,
            productMapper,
            loadCategoryAttributesUseCase,
            previewGeneratedDescriptionUseCase,
            createProductWithMatchingUseCase,
            listCategoriesUseCase,
            createCategoryUseCase,
            updateCategoryUseCase,
            deleteCategoryUseCase
        );

        const searchController = new SearchController();
        const matchingController = new ProductMatchingController(
            matchProductUseCase,
            confirmMatchUseCase,
            matchAuditRepository
        );
        const buyBoxRepository = new PrismaBuyBoxRepository(prisma);
        const buyBoxEventPublisher = new BuyBoxEventPublisher(eventBus as any);
        const buyBoxUseCase = new ComputeBuyBoxUseCase(
            buyBoxRepository,
            buyBoxEventPublisher as any,
            BuyBoxWeights.defaults()
        );
        const buyBoxController = new BuyBoxController(buyBoxUseCase, buyBoxRepository);
        const storefrontController = new SellerStorefrontController();
        const pricingController = new PricingController();

        // Initialize event registry
        initializeEventRegistry();

        // Initialize campaign event handlers
        try {
            const campaignEventBus = container.get(TYPES.EventBus) as { subscribe: (event: string, handler: (e: unknown) => void) => void };
            const productDeletedHandler = container.get(TYPES.ProductDeletedHandler) as { handle: (event: unknown) => void };
            const categoryDeletedHandler = container.get(TYPES.CategoryDeletedHandler) as { handle: (event: unknown) => void };

            if (campaignEventBus && campaignEventBus.subscribe) {
                campaignEventBus.subscribe('ProductDeleted', (event: unknown) => productDeletedHandler.handle(event));
                campaignEventBus.subscribe('CategoryDeleted', (event: unknown) => categoryDeletedHandler.handle(event));
                logger.info('Campaign handlers subscribed to events');
            }
        } catch (e) {
            logger.warn('Campaign handlers not initialized:', e);
        }

        // Initialize and start OutboxProcessor
        try {
            const outbox = new TransactionalOutbox(prisma, 'catalogOutboxEvent');
            outboxProcessor = new OutboxProcessor(prisma, outbox, eventBus, 'catalog-service');
            outboxProcessor.start();
            logger.info('Catalog-service outbox processor started');
        } catch (e) {
            logger.error('Failed to start catalog-service outbox processor:', e);
        }

        // Initialize Saga Recovery Worker
        try {
            const { SagaRecoveryWorker } = await import('../../shared/saga/saga-recovery.worker');

            const sagaFactory = createSagaFactory({
                sagaLogRepository,
                productRepository: productRepository as import('./src/domain/interfaces').ProductRepository,
                categoryRepository: categoryRepository as import('./src/domain/interfaces').CategoryRepository,
                mediaRepository: mediaRepository as import('./src/domain/interfaces').MediaRepository,
                searchService: searchService as import('./src/domain/interfaces').SearchService,
                eventPublisher: eventPublisher as import('./src/domain/interfaces').DomainEventPublisher,
                idGenerator,
                dateTimeService,
            });

            const productPublishingSaga = sagaFactory.getProductPublishingSaga();
            const bulkProductUpdateSaga = sagaFactory.getBulkProductUpdateSaga();

            const orchestratorRegistry = new Map<string, DistributedSagaOrchestrator<unknown>>();
            orchestratorRegistry.set('ProductPublishing', productPublishingSaga as DistributedSagaOrchestrator<unknown>);
            orchestratorRegistry.set('BulkProductUpdate', bulkProductUpdateSaga as DistributedSagaOrchestrator<unknown>);

            const sagaRecoveryWorker = new SagaRecoveryWorker(sagaLogRepository, orchestratorRegistry, {
                stuckThresholdMs: 5 * 60 * 1000,
                pollIntervalMs: 60 * 1000
            });
            sagaRecoveryWorker.start();

            logger.info('✅ Saga Recovery Worker initialized with 2 registered saga types');
        } catch (e) {
            logger.warn('⚠️ Failed to initialize Saga Recovery Worker', { error: e });
        }

        // Build router
        const router = Router();

        // Campaign routes
        try {
            const campaignRoutes = createCampaignRoutes();
            if (campaignRoutes) {
                router.use('/campaigns', campaignRoutes);
            }
        } catch (e) {
            logger.warn('Failed to mount campaign routes:', e);
        }

        // Pricing routes
        if (pricingRoutes) {
            router.use('/pricing', pricingRoutes);
            router.use('/pricing/health', pricingHealthRoutes);
        }

        // Catalog API routes
        try {
            router.use(createProductRoutes(productController as any));
            router.use(createSearchRoutes(searchController as any));
            router.use(new MatchingRoutes(matchingController as any).getRouter());
            router.use(new BuyBoxRoutes(buyBoxController as any).getRouter());
            router.use('/sellers', createSellerStorefrontRoutes(storefrontController as any));
            router.use(createCatalogPricingRoutes(pricingController as any));
        } catch (e) {
            logger.warn('Failed to mount catalog API routes, falling back to degraded handler:', e);
            router.all('/v1/*', (_req, res) => {
                res.status(503).json({
                    success: false,
                    error: 'Catalog API routes not available',
                    reason: 'Initialization failure'
                });
            });
        }

        router.get('/health', (_req, res) => {
            res.json({
                status: 'ok',
                service: 'catalog-service',
                modules: ['catalog', 'campaigns', 'pricing'],
                timestamp: new Date().toISOString()
            });
        });
        router.use(createCatalogHealthRoutes({
            searchHealthCheck: () => searchHealthMonitor.getHealthStatus(),
            searchProvider: searchConfig.provider,
            searchIndexName: searchConfig.indexName || 'catalog'
        }));
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createCatalogMaintenanceRoutes(prisma));

        CatalogModule.routes = router;
    },
    routes: Router(),
    shutdown: async () => {
        logger.info('Shutting down catalog-service module');
        if (outboxProcessor) {
            outboxProcessor.stop();
        }
    }
};
