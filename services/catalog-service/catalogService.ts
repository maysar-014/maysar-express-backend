import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../shared/events/eventBus';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Initialize event handlers
initializeEventHandlers();
initializeSupplierPricingHandlers();
initializeSellerSagaHandlers();

function initializeSellerSagaHandlers() {
  // Product Catalog Management Saga Events
  eventBus.subscribe('ProductCreationStarted', async (event) => {
    const { sellerId, productName, category } = event.data;
    
    const product = await prisma.product.create({
      data: {
        name: productName,
        category: category,
        sellerId,
        status: 'draft'
      }
    });
    
    await eventBus.publish({
      type: 'ProductCreated',
      data: { productId: product.id, sellerId, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ProductImagesUploaded', async (event) => {
    const { images } = event.data;
    
    await eventBus.publish({
      type: 'ProductSEOOptimized',
      data: { seoData: { optimized: true }, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ProductSEOOptimized', async (event) => {
    const { seoData } = event.data;
    
    await eventBus.publish({
      type: 'ProductCatalogSynced',
      data: { sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ProductCatalogSynced', async (event) => {
    await eventBus.publish({
      type: 'ProductPublished',
      data: { publishedAt: new Date(), sagaId: event.sagaId }
    });
  });

  // Pricing Management Saga Events
  eventBus.subscribe('PricingValidationRequested', async (event) => {
    const { sellerId, productId, pricing } = event.data;
    
    const isValid = pricing.price > 0;
    
    if (isValid) {
      await eventBus.publish({
        type: 'ProductPricingUpdated',
        data: { sellerId, productId, pricing, sagaId: event.sagaId }
      });
    }
  });

  eventBus.subscribe('ProductPricingUpdated', async (event) => {
    const { productId, pricing } = event.data;
    
    await prisma.productVariant.updateMany({
      where: { productId },
      data: {
        price: pricing.price,
        compareAtPrice: pricing.compareAtPrice
      }
    });
    
    await eventBus.publish({
      type: 'PricingChangeNotificationSent',
      data: { productId, sagaId: event.sagaId }
    });
  });

  // Promotional Campaign Saga Events
  eventBus.subscribe('CampaignValidationRequested', async (event) => {
    const { sellerId, campaign } = event.data;
    
    const isValid = campaign.startDate && campaign.endDate && campaign.discountPercentage > 0;
    
    if (isValid) {
      await eventBus.publish({
        type: 'PromotionalCampaignCreated',
        data: { sellerId, campaign, sagaId: event.sagaId }
      });
    }
  });

  eventBus.subscribe('PromotionalCampaignCreated', async (event) => {
    const { sellerId, campaign } = event.data;
    
    await eventBus.publish({
      type: 'CampaignActivated',
      data: { sellerId, campaignId: campaign.id, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('CampaignActivated', async (event) => {
    const { sellerId, campaignId } = event.data;
    
    await eventBus.publish({
      type: 'CampaignNotificationSent',
      data: { sellerId, campaignId, sagaId: event.sagaId }
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wholesale/pricing', async (req, res) => {
  try {
    const pricing = await prisma.wholesalePricing.create({
      data: req.body
    });
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function initializeSupplierPricingHandlers() {
  // Wholesale Pricing Events
  eventBus.subscribe('WholesaleCostAnalyzed', async (event) => {
    const { supplierId, products, costAnalysis } = event.data;
    
    const pricing = await calculateWholesalePricing(products, costAnalysis);
    
    await eventBus.publish({
      type: 'WholesalePricingCalculated',
      data: { supplierId, products, pricing, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('WholesalePricingCalculated', async (event) => {
    const { supplierId, products, pricing } = event.data;
    
    const approvedPricing = pricing;
    
    await eventBus.publish({
      type: 'WholesalePricingApproved',
      data: { supplierId, products, approvedPricing, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('WholesalePricingApproved', async (event) => {
    const { supplierId, products, approvedPricing } = event.data;
    
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
      type: 'WholesalePricingPublished',
      data: { supplierId, products, publishedAt: new Date(), sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('WholesalePricingPublished', async (event) => {
    const { supplierId, products } = event.data;
    
    await eventBus.publish({
      type: 'WholesalePricingNotificationSent',
      data: { supplierId, products, sagaId: event.sagaId }
    });
  });
}

async function calculateWholesalePricing(products, costAnalysis) {
  const pricing = {};
  
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
    const { sellerId, productData } = event.data;
    
    const product = await prisma.product.create({
      data: {
        ...productData,
        sellerId,
        status: 'draft'
      }
    });
    
    await eventBus.publish({
      type: 'ProductCreated',
      data: { productId: product.id, sellerId, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ProductImageUploadRequested', async (event) => {
    const { productId, images } = event.data;
    
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
      type: 'ProductImagesUploaded',
      data: { productId, imageCount: images.length, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('SEOOptimizationRequested', async (event) => {
    const { productId, seoData } = event.data;
    
    await prisma.product.update({
      where: { id: productId },
      data: { seoMetadata: seoData }
    });
    
    await eventBus.publish({
      type: 'SEOOptimizationCompleted',
      data: { productId, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('CatalogSyncRequested', async (event) => {
    const { sellerId } = event.data;
    
    // Sync catalog with external systems
    const products = await prisma.product.findMany({
      where: { sellerId },
      include: { variants: true }
    });
    
    await eventBus.publish({
      type: 'CatalogSynced',
      data: { sellerId, productCount: products.length, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('ProductPublicationRequested', async (event) => {
    const { productId } = event.data;
    
    await prisma.product.update({
      where: { id: productId },
      data: { status: 'published' }
    });
    
    await eventBus.publish({
      type: 'ProductPublished',
      data: { productId, sagaId: event.sagaId }
    });
  });

  // Bulk Product Operations Saga Events
  eventBus.subscribe('BulkProductOperationRequested', async (event) => {
    const { sellerId, operation, productIds } = event.data;
    
    await eventBus.publish({
      type: 'BulkProductOperationInitiated',
      data: { sellerId, operation, productIds, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('BulkProductOperationInitiated', async (event) => {
    const { operation, productIds } = event.data;
    
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
      type: 'BulkProductOperationCompleted',
      data: { operation, productIds, sagaId: event.sagaId }
    });
  });

  // Pricing Management Saga Events
  eventBus.subscribe('PricingValidationRequested', async (event) => {
    const { sellerId, productId, pricing } = event.data;
    
    // Validate pricing rules
    const isValid = pricing.price > 0 && (!pricing.compareAtPrice || pricing.compareAtPrice > pricing.price);
    
    if (isValid) {
      await eventBus.publish({
        type: 'ProductPricingUpdated',
        data: { sellerId, productId, pricing, sagaId: event.sagaId }
      });
    } else {
      throw new Error('Invalid pricing configuration');
    }
  });

  eventBus.subscribe('ProductPricingUpdated', async (event) => {
    const { productId, pricing } = event.data;
    
    await prisma.productVariant.updateMany({
      where: { productId },
      data: {
        price: pricing.price,
        compareAtPrice: pricing.compareAtPrice,
        costPrice: pricing.costPrice
      }
    });
    
    await eventBus.publish({
      type: 'PricingChangeNotificationSent',
      data: { productId, sagaId: event.sagaId }
    });
  });

  // Promotional Campaign Saga Events
  eventBus.subscribe('CampaignValidationRequested', async (event) => {
    const { sellerId, campaign } = event.data;
    
    // Validate campaign parameters
    const isValid = campaign.startDate && campaign.endDate && campaign.discountPercentage > 0;
    
    if (isValid) {
      await eventBus.publish({
        type: 'PromotionalCampaignCreated',
        data: { sellerId, campaign, sagaId: event.sagaId }
      });
    } else {
      throw new Error('Invalid campaign configuration');
    }
  });

  eventBus.subscribe('PromotionalCampaignCreated', async (event) => {
    const { sellerId, campaign } = event.data;
    
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
      type: 'CampaignActivated',
      data: { sellerId, campaignId: campaign.id, sagaId: event.sagaId }
    });
  });

  eventBus.subscribe('CampaignActivated', async (event) => {
    const { sellerId, campaignId } = event.data;
    
    await eventBus.publish({
      type: 'CampaignNotificationSent',
      data: { sellerId, campaignId, sagaId: event.sagaId }
    });
  });
}

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Catalog Service running on port ${PORT}`);
  console.log('Seller saga event handlers initialized');
});

export default app;