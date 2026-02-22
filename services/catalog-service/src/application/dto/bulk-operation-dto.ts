/**
 * Bulk Operation Data Transfer Objects
 * Defines data structures for bulk operation commands and results
 * Application layer data contracts for batch processing operations
 */

/**
 * Bulk Operation Types
 */
export type BulkOperationType =
  | 'product_update'
  | 'pricing_update'
  | 'inventory_update'
  | 'category_change'
  | 'status_change'
  | 'media_upload'
  | 'tag_management'
  | 'seo_update'
  | 'campaign_assignment'
  | 'bulk_delete';

/**
 * Bulk Operation Status
 */
export type BulkOperationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partial_success';

/**
 * Bulk Operation Priority
 */
export type BulkOperationPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Bulk Operation Command DTO
 * Input contract for initiating bulk operations
 */
export interface BulkOperationCommandDto {
  operationId: string;
  operationType: BulkOperationType;
  name: string;
  description?: string;
  priority: BulkOperationPriority;
  targetItems: string[]; // Product IDs, category IDs, etc.
  targetCriteria?: {
    filters: Record<string, any>;
    exclusions?: string[];
    limit?: number;
  };
  operationData: Record<string, any>; // Operation-specific data
  options: {
    batchSize?: number;
    maxConcurrency?: number;
    continueOnError?: boolean;
    validateBeforeExecute?: boolean;
    dryRun?: boolean;
    rollbackOnFailure?: boolean;
    notifyOnCompletion?: boolean;
    notifyOnProgress?: boolean;
  };
  schedule?: {
    executeAt?: Date;
    timezone?: string;
    recurrence?: {
      type: 'once' | 'daily' | 'weekly' | 'monthly';
      interval?: number;
      endDate?: Date;
    };
  };
  metadata: {
    requestedBy: string;
    requestId: string;
    source: string;
    tags?: string[];
    customFields?: Record<string, any>;
  };
}

/**
 * Bulk Operation Response DTO
 * Output contract for bulk operation initiation
 */
export interface BulkOperationResponseDto {
  operationId: string;
  status: BulkOperationStatus;
  message: string;
  estimatedDuration?: number;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress?: {
    percentage: number;
    currentBatch: number;
    totalBatches: number;
    currentItem?: string;
    itemsPerSecond?: number;
    estimatedTimeRemaining?: number;
  };
  validationResults?: {
    isValid: boolean;
    errors: Array<{
      itemId?: string;
      field: string;
      code: string;
      message: string;
    }>;
    warnings: Array<{
      itemId?: string;
      field: string;
      message: string;
    }>;
  };
}

/**
 * Bulk Operation Status DTO
 * Real-time status updates for bulk operations
 */
export interface BulkOperationStatusDto {
  operationId: string;
  status: BulkOperationStatus;
  progress: {
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    skippedItems: number;
    percentage: number;
    currentBatch: number;
    totalBatches: number;
    itemsPerSecond: number;
    estimatedTimeRemaining: number;
    lastProcessedItem?: string;
  };
  currentBatch?: {
    batchId: string;
    items: string[];
    startedAt: Date;
    status: 'processing' | 'completed' | 'failed';
  };
  errors: Array<{
    itemId: string;
    error: string;
    errorCode: string;
    timestamp: Date;
    retryCount?: number;
  }>;
  warnings: Array<{
    itemId?: string;
    warning: string;
    warningCode: string;
    timestamp: Date;
  }>;
  performance: {
    averageProcessingTime: number;
    totalProcessingTime: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  metadata: {
    startedAt: Date;
    lastUpdatedAt: Date;
    completedAt?: Date;
    requestedBy: string;
    operationType: BulkOperationType;
  };
}

/**
 * Bulk Operation Result DTO
 * Final results for completed bulk operations
 */
export interface BulkOperationResultDto {
  operationId: string;
  operationType: BulkOperationType;
  status: BulkOperationStatus;
  summary: {
    totalItems: number;
    successfulItems: number;
    failedItems: number;
    skippedItems: number;
    successRate: number;
    totalProcessingTime: number;
    averageProcessingTime: number;
  };
  results: {
    successful: Array<{
      itemId: string;
      result: any;
      processingTime: number;
    }>;
    failed: Array<{
      itemId: string;
      error: string;
      errorCode: string;
      retryCount: number;
      processingTime: number;
    }>;
    skipped: Array<{
      itemId: string;
      reason: string;
      reasonCode: string;
    }>;
  };
  analytics: {
    operationMetrics: Record<string, number>;
    performanceMetrics: {
      throughput: number; // items per second
      efficiency: number; // successful items / total processing time
      resourceUtilization: number;
    };
    errorAnalysis: {
      commonErrors: Array<{
        errorCode: string;
        count: number;
        percentage: number;
      }>;
      errorPatterns: string[];
    };
  };
  metadata: {
    name: string;
    description?: string;
    requestedBy: string;
    requestId: string;
    startedAt: Date;
    completedAt: Date;
    tags?: string[];
    customFields?: Record<string, any>;
  };
}

/**
 * Bulk Product Update Command DTO
 * Specialized DTO for bulk product updates
 */
export interface BulkProductUpdateCommandDto extends BulkOperationCommandDto {
  operationType: 'product_update';
  operationData: {
    updates: Record<string, any>; // Field updates to apply
    updateType: 'set' | 'merge' | 'increment' | 'append' | 'remove';
    conditions?: Record<string, any>; // Additional conditions for updates
    preserveTimestamps?: boolean;
    updateMetadata?: {
      updatedBy: string;
      updateReason: string;
      updateSource: string;
    };
  };
}

/**
 * Bulk Pricing Update Command DTO
 * Specialized DTO for bulk pricing operations
 */
export interface BulkPricingUpdateCommandDto extends BulkOperationCommandDto {
  operationType: 'pricing_update';
  operationData: {
    pricingStrategy: 'fixed' | 'percentage' | 'formula';
    pricingValue: number;
    currency?: string;
    effectiveDate?: Date;
    expiryDate?: Date;
    reason: string;
    validateBusinessRules?: boolean;
  };
}

/**
 * Bulk Inventory Update Command DTO
 * Specialized DTO for bulk inventory operations
 */
export interface BulkInventoryUpdateCommandDto extends BulkOperationCommandDto {
  operationType: 'inventory_update';
  operationData: {
    operation: 'set' | 'add' | 'subtract' | 'reserve' | 'release';
    quantity: number;
    reason: string;
    location?: string;
    reference?: string;
    adjustOnHand?: boolean;
    adjustReserved?: boolean;
  };
}

/**
 * Bulk Category Change Command DTO
 * Specialized DTO for bulk category operations
 */
export interface BulkCategoryChangeCommandDto extends BulkOperationCommandDto {
  operationType: 'category_change';
  operationData: {
    newCategoryId: string;
    updateProductAttributes?: boolean;
    preserveCategoryPath?: boolean;
    updateSearchIndex?: boolean;
  };
}

/**
 * Bulk Status Change Command DTO
 * Specialized DTO for bulk status operations
 */
export interface BulkStatusChangeCommandDto extends BulkOperationCommandDto {
  operationType: 'status_change';
  operationData: {
    newStatus: string;
    reason: string;
    notifyAffectedUsers?: boolean;
    cascadeToVariants?: boolean;
  };
}

/**
 * Bulk Media Upload Command DTO
 * Specialized DTO for bulk media operations
 */
export interface BulkMediaUploadCommandDto extends BulkOperationCommandDto {
  operationType: 'media_upload';
  operationData: {
    mediaFiles: Array<{
      fileName: string;
      fileUrl: string;
      fileType: 'image' | 'video' | 'document';
      altText?: string;
      order?: number;
      isPrimary?: boolean;
      metadata?: Record<string, any>;
    }>;
    processingOptions: {
      resizeImages?: boolean;
      generateThumbnails?: boolean;
      optimizeForWeb?: boolean;
      createVariants?: boolean;
    };
    uploadStrategy: 'sequential' | 'parallel' | 'batched';
  };
}

/**
 * Bulk Tag Management Command DTO
 * Specialized DTO for bulk tag operations
 */
export interface BulkTagManagementCommandDto extends BulkOperationCommandDto {
  operationType: 'tag_management';
  operationData: {
    operation: 'add' | 'remove' | 'replace' | 'clear';
    tags: string[];
    condition?: {
      existingTags?: string[];
      tagPattern?: string;
    };
  };
}

/**
 * Bulk SEO Update Command DTO
 * Specialized DTO for bulk SEO operations
 */
export interface BulkSeoUpdateCommandDto extends BulkOperationCommandDto {
  operationType: 'seo_update';
  operationData: {
    seoFields: {
      title?: string;
      description?: string;
      keywords?: string[];
      canonicalUrl?: string;
      metaTags?: Record<string, string>;
    };
    generateFromTemplate?: boolean;
    templateId?: string;
    autoGenerate?: {
      titleFromName: boolean;
      descriptionFromDescription: boolean;
      keywordsFromTags: boolean;
    };
  };
}

/**
 * Bulk Campaign Assignment Command DTO
 * Specialized DTO for bulk campaign operations
 */
export interface BulkCampaignAssignmentCommandDto extends BulkOperationCommandDto {
  operationType: 'campaign_assignment';
  operationData: {
    campaignId: string;
    campaignName: string;
    assignmentType: 'add' | 'remove' | 'replace';
    campaignData?: Record<string, any>;
    priority?: number;
  };
}

/**
 * Bulk Delete Command DTO
 * Specialized DTO for bulk delete operations
 */
export interface BulkDeleteCommandDto extends BulkOperationCommandDto {
  operationType: 'bulk_delete';
  operationData: {
    deleteType: 'soft' | 'hard';
    reason: string;
    cascadeDelete?: boolean; // Delete related entities
    preserveAudit?: boolean;
    backupBeforeDelete?: boolean;
  };
}

/**
 * Bulk Operation Batch DTO
 * Represents a single batch within a bulk operation
 */
export interface BulkOperationBatchDto {
  batchId: string;
  operationId: string;
  batchNumber: number;
  totalBatches: number;
  items: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  results: {
    successful: string[];
    failed: Array<{
      itemId: string;
      error: string;
      errorCode: string;
    }>;
  };
  retryCount: number;
  maxRetries: number;
  processingTime?: number;
}

/**
 * Bulk Operation Log Entry DTO
 * Audit log entry for bulk operations
 */
export interface BulkOperationLogEntryDto {
  logId: string;
  operationId: string;
  batchId?: string;
  itemId?: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  source: string;
  userId?: string;
}

/**
 * Bulk Operation Rollback Command DTO
 * Command to rollback a failed bulk operation
 */
export interface BulkOperationRollbackCommandDto {
  operationId: string;
  rollbackReason: string;
  rollbackScope: 'full' | 'partial' | 'failed_only';
  rollbackTo?: Date; // Rollback to specific point in time
  options: {
    validateRollback?: boolean;
    notifyOnRollback?: boolean;
    createBackup?: boolean;
  };
  requestedBy: string;
  requestId: string;
}

/**
 * Bulk Operation Rollback Result DTO
 * Results of a rollback operation
 */
export interface BulkOperationRollbackResultDto {
  operationId: string;
  rollbackId: string;
  status: 'completed' | 'failed' | 'partial';
  summary: {
    totalItems: number;
    rolledBackItems: number;
    failedRollbackItems: number;
    skippedItems: number;
  };
  details: {
    rolledBack: Array<{
      itemId: string;
      originalState: any;
      rollbackTime: number;
    }>;
    failed: Array<{
      itemId: string;
      error: string;
      errorCode: string;
    }>;
    skipped: Array<{
      itemId: string;
      reason: string;
    }>;
  };
  metadata: {
    requestedBy: string;
    requestId: string;
    startedAt: Date;
    completedAt: Date;
    rollbackReason: string;
  };
}

/**
 * Bulk Operation Template DTO
 * Reusable templates for common bulk operations
 */
export interface BulkOperationTemplateDto {
  templateId: string;
  name: string;
  description?: string;
  operationType: BulkOperationType;
  category: 'maintenance' | 'marketing' | 'operations' | 'compliance' | 'custom';
  baseCommand: Partial<BulkOperationCommandDto>;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
    required: boolean;
    defaultValue?: any;
    description?: string;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      enum?: string[];
    };
  }>;
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

/**
 * Type guards for runtime type checking
 */
export function isBulkOperationCommandDto(obj: any): obj is BulkOperationCommandDto {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    typeof obj.operationId === 'string' &&
    [
      'product_update', 'pricing_update', 'inventory_update', 'category_change',
      'status_change', 'media_upload', 'tag_management', 'seo_update',
      'campaign_assignment', 'bulk_delete'
    ].includes(obj.operationType) &&
    typeof obj.name === 'string' &&
    ['low', 'normal', 'high', 'critical'].includes(obj.priority) &&
    Array.isArray(obj.targetItems) &&
    obj.options &&
    typeof obj.options === 'object' &&
    obj.metadata &&
    typeof obj.metadata === 'object' &&
    typeof obj.metadata.requestedBy === 'string' &&
    typeof obj.metadata.requestId === 'string'
  );
}

export function isBulkOperationResultDto(obj: any): obj is BulkOperationResultDto {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    typeof obj.operationId === 'string' &&
    ['pending', 'processing', 'completed', 'failed', 'cancelled', 'partial_success'].includes(obj.status) &&
    obj.summary &&
    typeof obj.summary === 'object' &&
    obj.results &&
    typeof obj.results === 'object' &&
    obj.metadata &&
    typeof obj.metadata === 'object'
  );
}

export function isBulkOperationTemplateDto(obj: any): obj is BulkOperationTemplateDto {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    typeof obj.templateId === 'string' &&
    typeof obj.name === 'string' &&
    [
      'product_update', 'pricing_update', 'inventory_update', 'category_change',
      'status_change', 'media_upload', 'tag_management', 'seo_update',
      'campaign_assignment', 'bulk_delete'
    ].includes(obj.operationType) &&
    ['maintenance', 'marketing', 'operations', 'compliance', 'custom'].includes(obj.category) &&
    obj.baseCommand &&
    typeof obj.baseCommand === 'object' &&
    Array.isArray(obj.variables) &&
    typeof obj.isActive === 'boolean' &&
    typeof obj.usageCount === 'number' &&
    obj.createdBy &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
}

/**
 * DTO Factory Functions
 * Helper functions for creating validated DTOs
 */
export function createBulkOperationCommand(data: any): BulkOperationCommandDto {
  if (!isBulkOperationCommandDto(data)) {
    throw new Error('Invalid BulkOperationCommandDto data');
  }

  return {
    ...data,
    targetItems: [...data.targetItems],
    targetCriteria: data.targetCriteria ? { ...data.targetCriteria } : undefined,
    operationData: { ...data.operationData },
    options: { ...data.options },
    schedule: data.schedule ? { ...data.schedule } : undefined,
    metadata: {
      ...data.metadata,
      tags: data.metadata.tags ? [...data.metadata.tags] : undefined,
      customFields: data.metadata.customFields ? { ...data.metadata.customFields } : undefined
    }
  };
}

export function createBulkOperationTemplate(data: any): BulkOperationTemplateDto {
  if (!isBulkOperationTemplateDto(data)) {
    throw new Error('Invalid BulkOperationTemplateDto data');
  }

  return {
    ...data,
    baseCommand: { ...data.baseCommand },
    variables: [...(data.variables || [])],
    tags: data.tags ? [...data.tags] : undefined
  };
}
