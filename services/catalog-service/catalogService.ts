import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '@shared-events/eventBus';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { SearchEngineInitializer } from './src/infrastructure/search-initializer';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

let searchEngine: any;
let indexManager: any;

async function initializeServices() {
  const { searchEngine: engine, indexManager: manager } = await SearchEngineInitializer.initialize(prisma);
  searchEngine = engine;
  indexManager = manager;
}

initializeEventHandlers();
initializeSupplierPricingHandlers();
initializeSellerSagaHandlers();

function initializeSellerSagaHandlers() {
  // Product Catalog Management Saga Events
  eventBus.subscribe('ProductCreationStarted', async (event) => {
    const { sellerId, productName, category, sagaId } = event.payload;

    const product = await prisma.product.create({
      data: {
        name: productName,
        category: category,
        sellerId,
        status: 'draft'
      }
    });

    await eventBus.publish({
      event: 'ProductCreated',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { productId: product.id, sellerId, sagaId }
    });
  });

  eventBus.subscribe('ProductImagesUploaded', async (event) => {
    const { images, sagaId } = event.payload;

    await eventBus.publish({
      event: 'ProductSEOOptimized',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { seoData: { optimized: true }, sagaId }
    });
  });

  eventBus.subscribe('ProductSEOOptimized', async (event) => {
    const { seoData, sagaId } = event.payload;

    await eventBus.publish({
      event: 'ProductCatalogSynced',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { sagaId }
    });
  });

  eventBus.subscribe('ProductCatalogSynced', async (event) => {
    const { sagaId } = event.payload;

    await eventBus.publish({
      event: 'ProductPublished',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { publishedAt: new Date(), sagaId }
    });
  });

  // Pricing Management Saga Events
  eventBus.subscribe('PricingValidationRequested', async (event) => {
    const { sellerId, productId, pricing, sagaId } = event.payload;

    const isValid = pricing.price > 0;

    if (isValid) {
      await eventBus.publish({
        event: 'ProductPricingUpdated',
        version: 'v1',
        eventId: uuidv4(),
        producer: 'catalog-service',
        timestamp: new Date().toISOString(),
        payload: { sellerId, productId, pricing, sagaId }
      });
    }
  });

  eventBus.subscribe('ProductPricingUpdated', async (event) => {
    const { productId, pricing, sagaId } = event.payload;

    await prisma.productVariant.updateMany({
      where: { productId },
      data: {
        price: pricing.price,
        compareAtPrice: pricing.compareAtPrice
      }
    });

    await eventBus.publish({
      event: 'PricingChangeNotificationSent',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { productId, sagaId }
    });
  });

  // Promotional Campaign Saga Events
  eventBus.subscribe('CampaignValidationRequested', async (event) => {
    const { sellerId, campaign, sagaId } = event.payload;

    const isValid = campaign.startDate && campaign.endDate && campaign.discountPercentage > 0;

    if (isValid) {
      await eventBus.publish({
        event: 'PromotionalCampaignCreated',
        version: 'v1',
        eventId: uuidv4(),
        producer: 'catalog-service',
        timestamp: new Date().toISOString(),
        payload: { sellerId, campaign, sagaId }
      });
    }
  });

  eventBus.subscribe('PromotionalCampaignCreated', async (event) => {
    const { sellerId, campaign, sagaId } = event.payload;

    await eventBus.publish({
      event: 'CampaignActivated',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { sellerId, campaignId: campaign.id, sagaId }
    });
  });

  eventBus.subscribe('CampaignActivated', async (event) => {
    const { sellerId, campaignId, sagaId } = event.payload;

    await eventBus.publish({
      event: 'CampaignNotificationSent',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { sellerId, campaignId, sagaId }
    });
  });
}

// Product management endpoints
app.post('/api/products', async (req, res) => {
  try {
    const product = await prisma.product.create({
      data: req.body,
      include: { variants: true, category: true }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { variants: true, category: true }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/products/search', async (req, res) => {
  try {
    if (!searchEngine) {
      return res.status(503).json({ error: 'Search engine not initialized' });
    }
    
    const { text, filters, limit = 50, offset = 0 } = req.body;
    
    const results = searchEngine.search({
      text,
      filters,
      limit,
      offset
    });
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Wholesale pricing endpoints
app.get('/api/wholesale/pricing/:supplierId', async (req, res) => {
  try {
    const pricing = await prisma.wholesalePricing.findMany({
      where: { supplierId: req.params.supplierId }
    });
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/wholesale/pricing', async (req, res) => {
  try {
    const pricing = await prisma.wholesalePricing.create({
      data: req.body
    });
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

function initializeSupplierPricingHandlers() {
  // Wholesale Pricing Events
  eventBus.subscribe('WholesaleCostAnalyzed', async (event) => {
    const { supplierId, products, costAnalysis, sagaId } = event.payload;

    const pricing = await calculateWholesalePricing(products, costAnalysis);

    await eventBus.publish({
      event: 'WholesalePricingCalculated',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { supplierId, products, pricing, sagaId }
    });
  });

  eventBus.subscribe('WholesalePricingCalculated', async (event) => {
    const { supplierId, products, pricing, sagaId } = event.payload;

    const approvedPricing = pricing;

    await eventBus.publish({
      event: 'WholesalePricingApproved',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { supplierId, products, approvedPricing, sagaId }
    });
  });

  eventBus.subscribe('WholesalePricingApproved', async (event) => {
    const { supplierId, products, approvedPricing, sagaId } = event.payload;

    for (const product of products) {
      await prisma.wholesalePricing.upsert({
        where: {
          supplierId_productId: {
            supplierId,
            productId: product.id
          }
        },
        update: {
          pricing: approvedPricing[product.id],
          updatedAt: new Date()
        },
        create: {
          supplierId,
          productId: product.id,
          pricing: approvedPricing[product.id],
          status: 'active'
        }
      });
    }

    await eventBus.publish({
      event: 'WholesalePricingPublished',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { supplierId, products, publishedAt: new Date(), sagaId }
    });
  });

  eventBus.subscribe('WholesalePricingPublished', async (event) => {
    const { supplierId, products, sagaId } = event.payload;

    await eventBus.publish({
      event: 'WholesalePricingNotificationSent',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { supplierId, products, sagaId }
    });
  });
}

async function calculateWholesalePricing(products: any[], costAnalysis: any) {
  const pricing: any = {};

  for (const product of products) {
    const baseCost = costAnalysis[product.id]?.cost || 100;
    const markup = 0.3; // 30% markup

    pricing[product.id] = {
      unitPrice: baseCost * (1 + markup),
      bulkTiers: [
        { minQuantity: 100, discount: 0.05 },
        { minQuantity: 500, discount: 0.10 },
        { minQuantity: 1000, discount: 0.15 }
      ]
    };
  }

  return pricing;
}

function initializeEventHandlers() {
  // Product Catalog Management Saga Events
  eventBus.subscribe('ProductCreationRequested', async (event) => {
    const { sellerId, productData, sagaId } = event.payload;

    const product = await prisma.product.create({
      data: {
        ...productData,
        sellerId,
        status: 'draft'
      }
    });

    if (indexManager) {
      const searchableProduct = {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: 0,
        category: productData.category,
        brand: productData.brand,
        tags: productData.tags || [],
        status: product.status,
        stock: 0,
        rating: 0,
        type: productData.type
      };
      indexManager.onProductCreated(searchableProduct);
    }

    await eventBus.publish({
      event: 'ProductCreated',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { productId: product.id, sellerId, sagaId }
    });
  });

  eventBus.subscribe('ProductImageUploadRequested', async (event) => {
    const { productId, images, sagaId } = event.payload;

    // Store product images
    for (const image of images) {
      await prisma.mediaRef.create({
        data: {
          entityType: 'product',
          entityId: productId,
          mediaType: 'image',
          url: image.url,
          altText: image.altText,
          uploadedBy: image.uploadedBy
        }
      });
    }

    await eventBus.publish({
      event: 'ProductImagesUploaded',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { productId, imageCount: images.length, sagaId }
    });
  });

  eventBus.subscribe('SEOOptimizationRequested', async (event) => {
    const { productId, seoData, sagaId } = event.payload;

    await prisma.product.update({
      where: { id: productId },
      data: { seoMetadata: seoData }
    });

    await eventBus.publish({
      event: 'SEOOptimizationCompleted',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { productId, sagaId }
    });
  });

  eventBus.subscribe('CatalogSyncRequested', async (event) => {
    const { sellerId, sagaId } = event.payload;

    // Sync catalog with external systems
    const products = await prisma.product.findMany({
      where: { sellerId },
      include: { variants: true }
    });

    await eventBus.publish({
      event: 'CatalogSynced',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { sellerId, productCount: products.length, sagaId }
    });
  });

  eventBus.subscribe('ProductPublicationRequested', async (event) => {
    const { productId, sagaId } = event.payload;

    await prisma.product.update({
      where: { id: productId },
      data: { status: 'published' }
    });

    await eventBus.publish({
      event: 'ProductPublished',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { productId, sagaId }
    });
  });

  // Bulk Product Operations Saga Events
  eventBus.subscribe('BulkProductOperationRequested', async (event) => {
    const { sellerId, operation, productIds, sagaId } = event.payload;

    await eventBus.publish({
      event: 'BulkProductOperationInitiated',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { sellerId, operation, productIds, sagaId }
    });
  });

  eventBus.subscribe('BulkProductOperationInitiated', async (event) => {
    const { operation, productIds, sagaId } = event.payload;

    if (operation === 'publish') {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { status: 'published' }
      });
    } else if (operation === 'unpublish') {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { status: 'draft' }
      });
    }

    await eventBus.publish({
      event: 'BulkProductOperationCompleted',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { operation, productIds, sagaId }
    });
  });

  // Pricing Management Saga Events
  eventBus.subscribe('PricingValidationRequested', async (event) => {
    const { sellerId, productId, pricing, sagaId } = event.payload;

    // Validate pricing rules
    const isValid = pricing.price > 0 && (!pricing.compareAtPrice || pricing.compareAtPrice > pricing.price);

    if (isValid) {
      await eventBus.publish({
        event: 'ProductPricingUpdated',
        version: 'v1',
        eventId: uuidv4(),
        producer: 'catalog-service',
        timestamp: new Date().toISOString(),
        payload: { sellerId, productId, pricing, sagaId }
      });
    } else {
      throw new Error('Invalid pricing configuration');
    }
  });

  eventBus.subscribe('ProductPricingUpdated', async (event) => {
    const { productId, pricing, sagaId } = event.payload;

    await prisma.productVariant.updateMany({
      where: { productId },
      data: {
        price: pricing.price,
        compareAtPrice: pricing.compareAtPrice,
        costPrice: pricing.costPrice
      }
    });

    await eventBus.publish({
      event: 'PricingChangeNotificationSent',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { productId, sagaId }
    });
  });

  // Promotional Campaign Saga Events
  eventBus.subscribe('CampaignValidationRequested', async (event) => {
    const { sellerId, campaign, sagaId } = event.payload;

    // Validate campaign parameters
    const isValid = campaign.startDate && campaign.endDate && campaign.discountPercentage > 0;

    if (isValid) {
      await eventBus.publish({
        event: 'PromotionalCampaignCreated',
        version: 'v1',
        eventId: uuidv4(),
        producer: 'catalog-service',
        timestamp: new Date().toISOString(),
        payload: { sellerId, campaign, sagaId }
      });
    } else {
      throw new Error('Invalid campaign configuration');
    }
  });

  eventBus.subscribe('PromotionalCampaignCreated', async (event) => {
    const { sellerId, campaign, sagaId } = event.payload;

    // Apply campaign to products
    if (campaign.productIds) {
      for (const productId of campaign.productIds) {
        const variants = await prisma.productVariant.findMany({
          where: { productId }
        });

        for (const variant of variants) {
          const discountedPrice = variant.price * (1 - campaign.discountPercentage / 100);
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { compareAtPrice: variant.price, price: discountedPrice }
          });
        }
      }
    }

    await eventBus.publish({
      event: 'CampaignActivated',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { sellerId, campaignId: campaign.id, sagaId }
    });
  });

  eventBus.subscribe('CampaignActivated', async (event) => {
    const { sellerId, campaignId, sagaId } = event.payload;

    await eventBus.publish({
      event: 'CampaignNotificationSent',
      version: 'v1',
      eventId: uuidv4(),
      producer: 'catalog-service',
      timestamp: new Date().toISOString(),
      payload: { sellerId, campaignId, sagaId }
    });
  });
}

const PORT = process.env.PORT || 3005;

initializeServices().then(() => {
  app.listen(PORT, () => {
    console.log(`Catalog Service running on port ${PORT}`);
    console.log('Seller saga event handlers initialized');
    console.log('Optimized search engine ready');
  });
}).catch(error => {
  console.error('Failed to initialize services:', error);
  process.exit(1);
});

export default app;
