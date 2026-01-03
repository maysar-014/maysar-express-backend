import { Saga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

export interface ProductData {
  sellerId: string;
  productName: string;
  description: string;
  category: string;
  price: number;
  images: string[];
  specifications: any;
  inventory: {
    quantity: number;
    sku: string;
    warehouse: string;
  };
}

// Product Catalog Management Saga
export class ProductCatalogManagementSaga extends Saga {
  constructor() {
    super('ProductCatalogManagement');
  }

  async execute(context: SagaContext<ProductData>): Promise<void> {
    await this.addStep(new ProductCreationStep());
    await this.addStep(new ImageUploadStep());
    await this.addStep(new SEOOptimizationStep());
    await this.addStep(new CatalogSyncStep());
    await this.addStep(new ProductPublicationStep());
  }
}

class ProductCreationStep extends SagaStep {
  async execute(context: SagaContext<ProductData>): Promise<void> {
    const { sellerId, productName, description, category, price } = context.data;
    
    await eventBus.publish('ProductCreationStarted.v1', {
      sellerId,
      productName,
      category,
      sagaId: context.sagaId
    });

    const productId = `prod_${Date.now()}`;
    
    await eventBus.publish('ProductCreated.v1', {
      productId,
      sellerId,
      productName,
      description,
      category,
      price,
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<ProductData>): Promise<void> {
    await eventBus.publish('ProductCreationCancelled.v1', {
      sellerId: context.data.sellerId,
      sagaId: context.sagaId
    });
  }
}

class ImageUploadStep extends SagaStep {
  async execute(context: SagaContext<ProductData>): Promise<void> {
    const { images } = context.data;
    
    await eventBus.publish('ProductImagesUploaded.v1', {
      images,
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<ProductData>): Promise<void> {
    await eventBus.publish('ProductImagesRemoved.v1', {
      sagaId: context.sagaId
    });
  }
}

class SEOOptimizationStep extends SagaStep {
  async execute(context: SagaContext<ProductData>): Promise<void> {
    const { productName, description, category } = context.data;
    
    const seoData = {
      title: productName,
      metaDescription: description.substring(0, 160),
      keywords: [category, productName.split(' ')].flat(),
      slug: productName.toLowerCase().replace(/\s+/g, '-')
    };

    await eventBus.publish('ProductSEOOptimized.v1', {
      seoData,
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<ProductData>): Promise<void> {
    await eventBus.publish('ProductSEORemoved.v1', {
      sagaId: context.sagaId
    });
  }
}

class CatalogSyncStep extends SagaStep {
  async execute(context: SagaContext<ProductData>): Promise<void> {
    await eventBus.publish('ProductCatalogSynced.v1', {
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<ProductData>): Promise<void> {
    await eventBus.publish('ProductCatalogSyncReverted.v1', {
      sagaId: context.sagaId
    });
  }
}

class ProductPublicationStep extends SagaStep {
  async execute(context: SagaContext<ProductData>): Promise<void> {
    await eventBus.publish('ProductPublished.v1', {
      sagaId: context.sagaId,
      publishedAt: new Date()
    });
  }

  async compensate(context: SagaContext<ProductData>): Promise<void> {
    await eventBus.publish('ProductUnpublished.v1', {
      sagaId: context.sagaId
    });
  }
}

// Inventory Management Saga
export class InventoryManagementSaga extends Saga {
  constructor() {
    super('InventoryManagement');
  }

  async execute(context: SagaContext<{ productId: string; operation: string; data: any }>): Promise<void> {
    await this.addStep(new StockCheckStep());
    await this.addStep(new ReorderCalculationStep());
    await this.addStep(new SupplierNotificationStep());
    await this.addStep(new InventoryUpdateStep());
  }
}

class StockCheckStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { productId } = context.data;
    
    const stockLevel = 150; // Mock stock check
    const reorderPoint = 50;
    
    await eventBus.publish('StockChecked.v1', {
      productId,
      stockLevel,
      reorderPoint,
      needsReorder: stockLevel <= reorderPoint,
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('StockCheckCancelled.v1', {
      sagaId: context.sagaId
    });
  }
}

class ReorderCalculationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const reorderQuantity = 200;
    const estimatedCost = 5000;
    
    await eventBus.publish('ReorderCalculated.v1', {
      reorderQuantity,
      estimatedCost,
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('ReorderCalculationCancelled.v1', {
      sagaId: context.sagaId
    });
  }
}

class SupplierNotificationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('SupplierNotified.v1', {
      sagaId: context.sagaId,
      notifiedAt: new Date()
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('SupplierNotificationCancelled.v1', {
      sagaId: context.sagaId
    });
  }
}

class InventoryUpdateStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('InventoryUpdated.v1', {
      sagaId: context.sagaId,
      updatedAt: new Date()
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('InventoryUpdateReverted.v1', {
      sagaId: context.sagaId
    });
  }
}

// Bulk Product Operations Saga
export class BulkProductOperationsSaga extends Saga {
  constructor() {
    super('BulkProductOperations');
  }

  async execute(context: SagaContext<{ productIds: string[]; operation: string; data: any }>): Promise<void> {
    await this.addStep(new BulkValidationStep());
    await this.addStep(new BulkExecutionStep());
    await this.addStep(new BulkNotificationStep());
  }
}

class BulkValidationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { productIds, operation } = context.data;
    
    await eventBus.publish('BulkOperationValidated.v1', {
      productIds,
      operation,
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('BulkOperationValidationCancelled.v1', {
      sagaId: context.sagaId
    });
  }
}

class BulkExecutionStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { productIds, operation } = context.data;
    
    for (const productId of productIds) {
      await eventBus.publish('BulkProductOperationExecuted.v1', {
        productId,
        operation,
        sagaId: context.sagaId
      });
    }
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('BulkOperationReverted.v1', {
      sagaId: context.sagaId
    });
  }
}

class BulkNotificationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { productIds } = context.data;
    
    await eventBus.publish('BulkOperationCompleted.v1', {
      productCount: productIds.length,
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    // No compensation needed for notifications
  }
}