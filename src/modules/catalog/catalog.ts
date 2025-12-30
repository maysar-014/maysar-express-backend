import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'
import { EventEnvelope } from '../../../shared-contracts/types'
import { ProductPublishedEvent } from '../../../shared-contracts/events'
import { enhancedEventBus as eventBus } from '../../events/eventBus'

export enum ProductStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  SUSPENDED = 'suspended'
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document'
}

export interface ProductFilters {
  categoryId?: string
  sellerId?: string
  status?: ProductStatus
  isActive?: boolean
  isFeatured?: boolean
  minPrice?: number
  maxPrice?: number
  search?: string
  attributes?: Record<string, any>
}

export interface ProductSort {
  field: 'name' | 'price' | 'createdAt' | 'updatedAt' | 'popularity'
  direction: 'asc' | 'desc'
}

export interface CreateProductRequest {
  sellerId: string
  categoryId: string
  name: string
  description?: string
  basePrice: number // in cents
  currency?: string
  salePrice?: number
  costPrice?: number
  sku?: string
  barcode?: string
  trackInventory?: boolean
  totalStock?: number
  lowStockThreshold?: number
  metaTitle?: string
  metaDescription?: string
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  isFeatured?: boolean
  slug?: string
}

export interface CreateProductVariantRequest {
  productId: string
  name: string
  attributes: Record<string, any>
  price?: number
  salePrice?: number
  costPrice?: number
  stock?: number
  sku?: string
  lowStockThreshold?: number
}

export interface ProductMediaRequest {
  productId: string
  variantId?: string
  type: MediaType
  filename: string
  mimeType: string
  fileSize: number
  dimensions?: { width: number; height: number }
  altText?: string
  isPrimary?: boolean
}

export class CatalogService {
  constructor() {
    // Subscribe to events if needed
  }

  // Category Management
  async createCategory(name: string, parentId?: string, options?: {
    description?: string
    imageUrl?: string
    sortOrder?: number
  }) {
    // Determine category level
    let level = 1
    if (parentId) {
      const parent = await (prisma as any).category.findUnique({
        where: { id: parentId }
      })
      level = (parent?.level || 1) + 1
    }

    // Generate slug from name
    const slug = this.generateSlug(name)

    const category = await (prisma as any).category.create({
      data: {
        name,
        slug,
        parentId,
        level,
        description: options?.description,
        imageUrl: options?.imageUrl,
        sortOrder: options?.sortOrder || 0
      },
      include: {
        parent: true,
        children: true
      }
    })

    return category
  }

  async getCategories(includeProducts: boolean = false, activeOnly: boolean = true) {
    const where = activeOnly ? { isActive: true } : {}
    const include = includeProducts ? {
      products: {
        where: { isActive: true, status: ProductStatus.PUBLISHED }
      }
    } : {}

    const categories = await (prisma as any).category.findMany({
      where,
      include: {
        children: {
          include,
          orderBy: { sortOrder: 'asc' }
        },
        ...include
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    return this.buildCategoryTree(categories)
  }

  async getCategoryById(id: string, includeProducts: boolean = false) {
    return await (prisma as any).category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: includeProducts ? {
          where: { isActive: true, status: ProductStatus.PUBLISHED },
          include: {
            variants: true,
            media: { where: { isPrimary: true } }
          }
        } : false
      }
    })
  }

  async updateCategory(id: string, updates: Partial<{
    name: string
    slug: string
    description: string
    imageUrl: string
    isActive: boolean
    sortOrder: number
  }>) {
    if (updates.name) {
      (updates as any).slug = this.generateSlug(updates.name)
    }

    return await (prisma as any).category.update({
      where: { id },
      data: updates,
      include: {
        parent: true,
        children: true
      }
    })
  }

  // Product Management
  async createProduct(request: CreateProductRequest): Promise<any> {
    const slug = this.generateSlug(request.name)
    const sku = request.sku || this.generateSKU(request.sellerId, request.categoryId)

    const product = await (prisma as any).product.create({
      data: {
        sellerId: request.sellerId,
        categoryId: request.categoryId,
        name: request.name,
        description: request.description,
        slug,
        sku,
        barcode: request.barcode,
        basePrice: request.basePrice,
        currency: request.currency || 'TZS',
        salePrice: request.salePrice,
        costPrice: request.costPrice,
        trackInventory: request.trackInventory !== false,
        totalStock: request.totalStock || 0,
        lowStockThreshold: request.lowStockThreshold || 5,
        metaTitle: request.metaTitle,
        metaDescription: request.metaDescription
      },
      include: {
        category: true,
        variants: true,
        media: true,
        attributes: true
      }
    })

    return product
  }

  async getProductById(id: string, includeVariants: boolean = true, includeMedia: boolean = true) {
    const include: any = {
      category: true,
      attributes: true
    }

    if (includeVariants) {
      include.variants = {
        orderBy: { sortOrder: 'asc' }
      }
    }

    if (includeMedia) {
      include.media = {
        orderBy: { sortOrder: 'asc' }
      }
    }

    return await (prisma as any).product.findUnique({
      where: { id },
      include
    })
  }

  async getProductBySlug(slug: string, includeVariants: boolean = true, includeMedia: boolean = true) {
    const include: any = {
      category: true,
      attributes: true
    }

    if (includeVariants) {
      include.variants = {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      }
    }

    if (includeMedia) {
      include.media = {
        orderBy: { sortOrder: 'asc' }
      }
    }

    return await (prisma as any).product.findUnique({
      where: { slug },
      include
    })
  }

  async updateProduct(id: string, updates: UpdateProductRequest): Promise<any> {
    if (updates.name) {
      updates.slug = this.generateSlug(updates.name)
    }

    const product = await (prisma as any).product.update({
      where: { id },
      data: updates,
      include: {
        category: true,
        variants: true,
        media: true,
        attributes: true
      }
    })

    return product
  }

  async publishProduct(id: string): Promise<any> {
    const product = await (prisma as any).product.update({
      where: { id },
      data: {
        status: ProductStatus.PUBLISHED,
        isActive: true,
        publishedAt: new Date()
      },
      include: {
        category: true,
        variants: true,
        media: true,
        attributes: true
      }
    })

    // Emit ProductPublished event using helper function
    const envelope = eventBus.createEventEnvelope<ProductPublishedEvent>('ProductPublished', {
      productId: product.id,
      sellerId: product.sellerId,
      name: product.name,
      price: { amount: product.basePrice, currency: product.currency }
    })

    eventBus.publish(envelope)

    return product
  }

  async archiveProduct(id: string, reason?: string): Promise<any> {
    return await (prisma as any).product.update({
      where: { id },
      data: {
        status: ProductStatus.ARCHIVED,
        isActive: false
      }
    })
  }

  async deleteProduct(id: string): Promise<void> {
    // Soft delete - mark as archived
    await this.archiveProduct(id)
  }

  // Product Search and Filtering
  async searchProducts(filters: ProductFilters, sort?: ProductSort, page: number = 1, limit: number = 20) {
    const where: any = {}

    // Basic filters
    if (filters.categoryId) where.categoryId = filters.categoryId
    if (filters.sellerId) where.sellerId = filters.sellerId
    if (filters.status) where.status = filters.status
    if (filters.isActive !== undefined) where.isActive = filters.isActive
    if (filters.isFeatured !== undefined) where.isFeatured = filters.isFeatured

    // Price filters
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.basePrice = {}
      if (filters.minPrice !== undefined) where.basePrice.gte = filters.minPrice
      if (filters.maxPrice !== undefined) where.basePrice.lte = filters.maxPrice
    }

    // Search filter
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    // Attribute filters
    if (filters.attributes) {
      // This would require more complex querying
      // For now, we'll handle basic attribute filtering
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' }
    if (sort) {
      switch (sort.field) {
        case 'name':
          orderBy = { name: sort.direction }
          break
        case 'price':
          orderBy = { basePrice: sort.direction }
          break
        case 'createdAt':
          orderBy = { createdAt: sort.direction }
          break
        case 'updatedAt':
          orderBy = { updatedAt: sort.direction }
          break
        case 'popularity':
          // Would need a popularity score field
          orderBy = { createdAt: 'desc' }
          break
      }
    }

    const products = await (prisma as any).product.findMany({
      where,
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        media: {
          where: { isPrimary: true }
        },
        attributes: {
          where: { isFilterable: true }
        }
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await (prisma as any).product.count({ where })

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  // Product Variants Management
  async createProductVariant(request: CreateProductVariantRequest): Promise<any> {
    const sku = request.sku || this.generateVariantSKU(request.productId)

    const variant = await (prisma as any).productVariant.create({
      data: {
        productId: request.productId,
        name: request.name,
        sku,
        attributes: request.attributes,
        price: request.price,
        salePrice: request.salePrice,
        costPrice: request.costPrice,
        stock: request.stock || 0,
        lowStockThreshold: request.lowStockThreshold || 5
      }
    })

    return variant
  }

  async updateProductVariant(id: string, updates: Partial<CreateProductVariantRequest>): Promise<any> {
    return await (prisma as any).productVariant.update({
      where: { id },
      data: updates
    })
  }

  async deleteProductVariant(id: string): Promise<void> {
    await (prisma as any).productVariant.update({
      where: { id },
      data: { isActive: false }
    })
  }

  // Media Management
  async addProductMedia(request: ProductMediaRequest): Promise<any> {
    // In a real implementation, this would upload to CDN and get the URL
    // For now, we'll assume the URL is provided
    const url = `https://cdn.maysar.co.tz/products/${request.productId}/${request.filename}`
    const thumbnailUrl = request.type === MediaType.IMAGE
      ? `https://cdn.maysar.co.tz/products/${request.productId}/thumb_${request.filename}`
      : undefined

    const media = await (prisma as any).productMedia.create({
      data: {
        productId: request.productId,
        variantId: request.variantId,
        type: request.type,
        url,
        thumbnailUrl,
        filename: request.filename,
        mimeType: request.mimeType,
        fileSize: request.fileSize,
        dimensions: request.dimensions,
        altText: request.altText,
        isPrimary: request.isPrimary || false,
        sortOrder: 0 // Would be calculated based on existing media
      }
    })

    return media
  }

  async updateProductMedia(id: string, updates: Partial<{
    altText: string
    isPrimary: boolean
    sortOrder: number
  }>): Promise<any> {
    return await (prisma as any).productMedia.update({
      where: { id },
      data: updates
    })
  }

  async deleteProductMedia(id: string): Promise<void> {
    // In real implementation, also delete from CDN
    await (prisma as any).productMedia.delete({
      where: { id }
    })
  }

  // Product Attributes
  async addProductAttribute(productId: string, name: string, value: string, options?: {
    type?: string
    isFilterable?: boolean
    isSearchable?: boolean
    sortOrder?: number
  }): Promise<any> {
    return await (prisma as any).productAttribute.create({
      data: {
        productId,
        name,
        value,
        type: options?.type || 'text',
        isFilterable: options?.isFilterable || false,
        isSearchable: options?.isSearchable || false,
        sortOrder: options?.sortOrder || 0
      }
    })
  }

  async updateProductAttribute(id: string, updates: Partial<{
    name: string
    value: string
    type: string
    isFilterable: boolean
    isSearchable: boolean
    sortOrder: number
  }>): Promise<any> {
    return await (prisma as any).productAttribute.update({
      where: { id },
      data: updates
    })
  }

  async deleteProductAttribute(id: string): Promise<void> {
    await (prisma as any).productAttribute.delete({
      where: { id }
    })
  }

  // Analytics and Reporting
  async getProductStats(filters?: {
    sellerId?: string
    categoryId?: string
    fromDate?: Date
    toDate?: Date
  }) {
    const where: any = {}

    if (filters?.sellerId) where.sellerId = filters.sellerId
    if (filters?.categoryId) where.categoryId = filters.categoryId
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {}
      if (filters.fromDate) where.createdAt.gte = filters.fromDate
      if (filters.toDate) where.createdAt.lte = filters.toDate
    }

    const [
      totalProducts,
      productsByStatus,
      productsByCategory,
      averagePrice
    ] = await Promise.all([
      (prisma as any).product.count({ where }),
      (prisma as any).product.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      (prisma as any).product.groupBy({
        by: ['categoryId'],
        where,
        _count: true
      }),
      (prisma as any).product.aggregate({
        where,
        _avg: { basePrice: true }
      })
    ])

    return {
      totalProducts,
      productsByStatus: productsByStatus.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat._count
        return acc
      }, {}),
      productsByCategory: productsByCategory.reduce((acc: any, stat: any) => {
        acc[stat.categoryId] = stat._count
        return acc
      }, {}),
      averagePrice: averagePrice._avg.basePrice || 0
    }
  }

  // Bulk Operations
  async bulkUpdateProductStatus(productIds: string[], status: ProductStatus, reason?: string) {
    const results = []

    for (const productId of productIds) {
      try {
        const product = await (prisma as any).product.update({
          where: { id: productId },
          data: { status }
        })
        results.push({ productId, success: true, product })
      } catch (error) {
        results.push({ productId, success: false, error: (error as Error).message })
      }
    }

    return results
  }

  async bulkUpdateProductCategory(productIds: string[], categoryId: string) {
    const results = []

    for (const productId of productIds) {
      try {
        const product = await (prisma as any).product.update({
          where: { id: productId },
          data: { categoryId }
        })
        results.push({ productId, success: true, product })
      } catch (error) {
        results.push({ productId, success: false, error: (error as Error).message })
      }
    }

    return results
  }

  // Utility Methods
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  private generateSKU(sellerId: string, categoryId: string): string {
    const timestamp = Date.now().toString().slice(-6)
    const sellerCode = sellerId.slice(-2).toUpperCase()
    const categoryCode = categoryId.slice(-2).toUpperCase()
    return `MYS${sellerCode}${categoryCode}${timestamp}`
  }

  private generateVariantSKU(productId: string): string {
    const timestamp = Date.now().toString().slice(-4)
    const productCode = productId.slice(-2).toUpperCase()
    return `VAR${productCode}${timestamp}`
  }

  private buildCategoryTree(categories: any[]): any[] {
    const categoryMap = new Map()
    const roots: any[] = []

    // Create category map
    categories.forEach(category => {
      category.children = []
      categoryMap.set(category.id, category)
    })

    // Build tree
    categories.forEach(category => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children.push(category)
        }
      } else {
        roots.push(category)
      }
    })

    return roots
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      await (prisma as any).product.count()
      return {
        status: 'healthy',
        service: 'catalog-service'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'catalog-service',
        error: (error as Error).message
      }
    }
  }
}
