/**
 * Domain Interfaces Documentation
 * Complete specification of domain interfaces for infrastructure binding
 * Pure domain declarations - no implementations
 */

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

/**
 * Product Repository Interface
 * Defines contract for product persistence operations
 */
export interface ProductRepository {
  /**
   * Save a product entity
   * @param product The product entity to save
   * @returns Promise resolving to the saved product
   */
  save(product: any): Promise<any>;

  /**
   * Save a product using persistence DTO
   * @param dto The product persistence DTO
   * @returns Promise resolving to the saved product
   */
  savePersistenceDto?(dto: any): Promise<any>;

  /**
   * Find product by ID
   * @param id Product identifier
   * @returns Promise resolving to product or null
   */
  findById(id: string): Promise<any | null>;

  /**
   * Find products by seller
   * @param sellerId Seller identifier
   * @returns Promise resolving to array of products
   */
  findBySeller(sellerId: string): Promise<any[]>;

  /**
   * Find products by category
   * @param categoryId Category identifier
   * @returns Promise resolving to array of products
   */
  findByCategory(categoryId: string): Promise<any[]>;

  /**
   * Search products with filters
   * @param filters Search criteria
   * @param pagination Pagination parameters
   * @returns Promise resolving to paginated results
   */
  search(filters: any, pagination: any): Promise<any>;

  /**
   * Update product status
   * @param id Product identifier
   * @param status New status
   * @returns Promise resolving to updated product
   */
  updateStatus(id: string, status: string): Promise<any>;

  /**
   * Delete product
   * @param id Product identifier
   * @returns Promise resolving to success status
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Category Repository Interface
 * Defines contract for category persistence operations
 */
export interface CategoryRepository {
  /**
   * Save a category entity
   * @param category The category entity to save
   * @returns Promise resolving to the saved category
   */
  save(category: any): Promise<any>;

  /**
   * Find category by ID
   * @param id Category identifier
   * @returns Promise resolving to category or null
   */
  findById(id: string): Promise<any | null>;

  /**
   * Find all categories
   * @returns Promise resolving to array of categories
   */
  findAll(): Promise<any[]>;

  /**
   * Find category by slug
   * @param slug Category slug
   * @returns Promise resolving to category or null
   */
  findBySlug(slug: string): Promise<any | null>;

  /**
   * Find subcategories of a parent category
   * @param parentId Parent category identifier
   * @returns Promise resolving to array of subcategories
   */
  findSubcategories(parentId: string): Promise<any[]>;

  /**
   * Update category
   * @param id Category identifier
   * @param updates Category updates
   * @returns Promise resolving to updated category
   */
  update(id: string, updates: any): Promise<any>;
}

/**
 * Seller Repository Interface
 * Defines contract for seller persistence operations
 */
export interface SellerRepository {
  /**
   * Save a seller entity
   * @param seller The seller entity to save
   * @returns Promise resolving to the saved seller
   */
  save(seller: any): Promise<any>;

  /**
   * Find seller by ID
   * @param id Seller identifier
   * @returns Promise resolving to seller or null
   */
  findById(id: string): Promise<any | null>;

  /**
   * Find seller by email
   * @param email Seller email
   * @returns Promise resolving to seller or null
   */
  findByEmail(email: string): Promise<any | null>;

  /**
   * Update seller profile
   * @param id Seller identifier
   * @param updates Profile updates
   * @returns Promise resolving to updated seller
   */
  updateProfile(id: string, updates: any): Promise<any>;

  /**
   * Update seller metrics
   * @param id Seller identifier
   * @param metrics Performance metrics
   * @returns Promise resolving to updated seller
   */
  updateMetrics(id: string, metrics: any): Promise<any>;
}

/**
 * Inventory Repository Interface
 * Defines contract for inventory persistence operations
 */
export interface InventoryRepository {
  /**
   * Update stock levels
   * @param productId Product identifier
   * @param variantId Variant identifier (optional)
   * @param quantity New quantity
   * @returns Promise resolving to success status
   */
  updateStock(productId: string, variantId: string | null, quantity: number): Promise<boolean>;

  /**
   * Reserve stock for order
   * @param productId Product identifier
   * @param variantId Variant identifier (optional)
   * @param quantity Quantity to reserve
   * @param reservationId Reservation identifier
   * @returns Promise resolving to success status
   */
  reserveStock(productId: string, variantId: string | null, quantity: number, reservationId: string): Promise<boolean>;

  /**
   * Release reserved stock
   * @param reservationId Reservation identifier
   * @returns Promise resolving to success status
   */
  releaseStock(reservationId: string): Promise<boolean>;

  /**
   * Get current stock levels
   * @param productId Product identifier
   * @param variantId Variant identifier (optional)
   * @returns Promise resolving to stock information
   */
  getStock(productId: string, variantId?: string): Promise<any>;

  /**
   * Get low stock alerts
   * @param threshold Minimum stock threshold
   * @returns Promise resolving to low stock items
   */
  getLowStockAlerts(threshold: number): Promise<any[]>;
}

/**
 * Media Repository Interface
 * Defines contract for media file persistence operations
 */
export interface MediaRepository {
  /**
   * Save media file metadata
   * @param media Media entity
   * @returns Promise resolving to saved media
   */
  save(media: any): Promise<any>;

  /**
   * Find media by ID
   * @param id Media identifier
   * @returns Promise resolving to media or null
   */
  findById(id: string): Promise<any | null>;

  /**
   * Find media by product
   * @param productId Product identifier
   * @returns Promise resolving to array of media
   */
  findByProduct(productId: string): Promise<any[]>;

  /**
   * Delete media
   * @param id Media identifier
   * @returns Promise resolving to success status
   */
  delete(id: string): Promise<boolean>;

  /**
   * Update media metadata
   * @param id Media identifier
   * @param metadata Updated metadata
   * @returns Promise resolving to updated media
   */
  updateMetadata(id: string, metadata: any): Promise<any>;
}

// ============================================================================
// EVENT PUBLISHER INTERFACES
// ============================================================================

/**
 * Domain Event Publisher Interface
 * Defines contract for publishing domain events
 */
export interface DomainEventPublisher {
  /**
   * Publish a domain event
   * @param event The domain event to publish
   * @returns Promise resolving when event is published
   */
  publish(event: any): Promise<void>;

  /**
   * Publish multiple domain events
   * @param events Array of domain events
   * @returns Promise resolving when all events are published
   */
  publishAll(events: any[]): Promise<void>;
}

/**
 * Event Store Interface
 * Defines contract for event persistence
 */
export interface EventStore {
  /**
   * Save domain events
   * @param events Array of domain events
   * @returns Promise resolving when events are saved
   */
  save(events: any[]): Promise<void>;

  /**
   * Load events for an aggregate
   * @param aggregateId Aggregate identifier
   * @param fromVersion Optional starting version
   * @returns Promise resolving to array of events
   */
  load(aggregateId: string, fromVersion?: number): Promise<any[]>;

  /**
   * Get event stream for aggregate type
   * @param aggregateType Type of aggregate
   * @param aggregateId Aggregate identifier
   * @returns Promise resolving to event stream
   */
  getStream(aggregateType: string, aggregateId: string): Promise<any[]>;
}

// ============================================================================
// EXTERNAL SERVICE INTERFACES
// ============================================================================

/**
 * Search Service Interface
 * Defines contract for search operations
 */
export interface SearchService {
  /**
   * Index a document for search
   * @param document Document to index
   * @returns Promise resolving when document is indexed
   */
  index(document: any): Promise<void>;

  /**
   * Search documents
   * @param query Search query
   * @param filters Search filters
   * @param pagination Pagination parameters
   * @returns Promise resolving to search results
   */
  search(query: string, filters: any, pagination: any): Promise<any>;

  /**
   * Remove document from search index
   * @param id Document identifier
   * @returns Promise resolving when document is removed
   */
  remove(id: string): Promise<void>;

  /**
   * Update search index for document
   * @param id Document identifier
   * @param updates Updated fields
   * @returns Promise resolving when document is updated
   */
  update(id: string, updates: any): Promise<void>;
}

/**
 * Cache Service Interface
 * Defines contract for caching operations
 */
export interface CacheService {
  /**
   * Get value from cache
   * @param key Cache key
   * @returns Promise resolving to cached value or null
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds
   * @returns Promise resolving when value is cached
   */
  set(key: string, value: any, ttl?: number): Promise<void>;

  /**
   * Delete value from cache
   * @param key Cache key
   * @returns Promise resolving to success status
   */
  delete(key: string): Promise<boolean>;

  /**
   * Clear all cached values
   * @returns Promise resolving when cache is cleared
   */
  clear(): Promise<void>;

  /**
   * Check if key exists in cache
   * @param key Cache key
   * @returns Promise resolving to existence status
   */
  exists(key: string): Promise<boolean>;
}

/**
 * File Storage Service Interface
 * Defines contract for file storage operations
 */
export interface FileStorageService {
  /**
   * Upload file
   * @param file File data
   * @param metadata File metadata
   * @returns Promise resolving to file information
   */
  upload(file: Buffer, metadata: any): Promise<any>;

  /**
   * Download file
   * @param fileId File identifier
   * @returns Promise resolving to file data
   */
  download(fileId: string): Promise<Buffer>;

  /**
   * Delete file
   * @param fileId File identifier
   * @returns Promise resolving to success status
   */
  delete(fileId: string): Promise<boolean>;

  /**
   * Get file metadata
   * @param fileId File identifier
   * @returns Promise resolving to file metadata
   */
  getMetadata(fileId: string): Promise<any>;

  /**
   * Generate presigned URL for file access
   * @param fileId File identifier
   * @param expiresIn Expiration time in seconds
   * @returns Promise resolving to presigned URL
   */
  getPresignedUrl(fileId: string, expiresIn: number): Promise<string>;
}

// ============================================================================
// INFRASTRUCTURE CONFIGURATION INTERFACES
// ============================================================================

/**
 * ID Generator Interface
 * Defines contract for ID generation (moved from domain for purity)
 */
export interface IdGenerator {
  /**
   * Generate a unique identifier
   * @returns Unique identifier string
   */
  generate(): string;

  /**
   * Validate an identifier format
   * @param id Identifier to validate
   * @returns True if valid, false otherwise
   */
  validate(id: string): boolean;
}

/**
 * Date/Time Service Interface
 * Defines contract for date and time operations
 */
export interface DateTimeService {
  /**
   * Get current date and time
   * @returns Current Date object
   */
  now(): Date;

  /**
   * Get current timestamp
   * @returns Current timestamp in milliseconds
   */
  timestamp(): number;

  /**
   * Add time to a date
   * @param date Base date
   * @param amount Amount to add
   * @param unit Time unit ('days', 'hours', 'minutes', etc.)
   * @returns New date with time added
   */
  add(date: Date, amount: number, unit: string): Date;

  /**
   * Check if date is in the past
   * @param date Date to check
   * @returns True if date is in the past
   */
  isPast(date: Date): boolean;

  /**
   * Format date for display
   * @param date Date to format
   * @param format Format string
   * @returns Formatted date string
   */
  format(date: Date, format: string): string;
}

/**
 * Logging Service Interface
 * Defines contract for logging operations
 */
export interface LoggingService {
  /**
   * Log debug message
   * @param message Log message
   * @param context Additional context
   */
  debug(message: string, context?: any): void;

  /**
   * Log info message
   * @param message Log message
   * @param context Additional context
   */
  info(message: string, context?: any): void;

  /**
   * Log warning message
   * @param message Log message
   * @param context Additional context
   */
  warn(message: string, context?: any): void;

  /**
   * Log error message
   * @param message Log message
   * @param context Additional context
   */
  error(message: string, context?: any): void;
}

// ============================================================================
// DOMAIN EVENT INTERFACES
// ============================================================================

/**
 * Domain Event Interface
 * Base interface for all domain events
 */
export interface DomainEvent {
  /**
   * Event identifier
   */
  eventId: string;

  /**
   * Event type
   */
  eventType: string;

  /**
   * Aggregate identifier
   */
  aggregateId: string;

  /**
   * Event version
   */
  version: number;

  /**
   * Event timestamp
   */
  timestamp: Date;

  /**
   * Event payload
   */
  payload: any;

  /**
   * Event metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Product Domain Events
 */
export interface ProductCreatedEvent extends DomainEvent {
  eventType: 'ProductCreated';
  payload: {
    productId: string;
    sellerId: string;
    name: string;
    price: number;
    category: string;
  };
}

export interface ProductUpdatedEvent extends DomainEvent {
  eventType: 'ProductUpdated';
  payload: {
    productId: string;
    changes: Record<string, any>;
  };
}

export interface ProductPublishedEvent extends DomainEvent {
  eventType: 'ProductPublished';
  payload: {
    productId: string;
    visibility: string;
  };
}

/**
 * Inventory Domain Events
 */
export interface StockUpdatedEvent extends DomainEvent {
  eventType: 'StockUpdated';
  payload: {
    productId: string;
    variantId?: string;
    oldStock: number;
    newStock: number;
  };
}

export interface LowStockAlertEvent extends DomainEvent {
  eventType: 'LowStockAlert';
  payload: {
    productId: string;
    currentStock: number;
    reorderPoint: number;
  };
}

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

/**
 * Validation Error Class
 * Represents validation errors in the domain
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// FACTORY INTERFACES
// ============================================================================

/**
 * Entity Factory Interface
 * Defines contract for creating domain entities
 */
export interface EntityFactory {
  /**
   * Create product entity
   * @param data Product creation data
   * @returns New product entity
   */
  createProduct(data: any): any;

  /**
   * Create seller entity
   * @param data Seller creation data
   * @returns New seller entity
   */
  createSeller(data: any): any;

  /**
   * Create category entity
   * @param data Category creation data
   * @returns New category entity
   */
  createCategory(data: any): any;
}

/**
 * Value Object Factory Interface
 * Defines contract for creating domain value objects
 */
export interface ValueObjectFactory {
  /**
   * Create price value object
   * @param amount Price amount
   * @param currency Currency code
   * @returns Price value object
   */
  createPrice(amount: number, currency?: string): any;

  /**
   * Create product ID
   * @param idGenerator ID generator implementation
   * @returns Product ID value object
   */
  createProductId(idGenerator?: any): any;

  /**
   * Create address value object
   * @param data Address data
   * @returns Address value object
   */
  createAddress(data: any): any;
}
