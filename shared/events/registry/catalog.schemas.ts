import { EventSchema, eventRegistry } from './base';

interface ProductCreatedData {
    productId?: string;
    name?: string;
    price?: number;
}

interface ProductCreatedWithStructuredData {
    productId?: string;
    sellerId?: string;
    slug?: string;
    categorySlug?: string;
    qualityScore?: number;
}

interface CategoryCreatedData {
    categoryId?: string;
    name?: string;
}

const asRecord = (data: unknown): Record<string, unknown> =>
    typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};

/**
 * Product Created Event Schema
 */
export const ProductCreatedSchema: EventSchema<ProductCreatedData> = {
    eventType: 'ProductCreated',
    version: 'v1',
    validate(data: unknown) {
        const parsed = asRecord(data) as ProductCreatedData;
        const errors: string[] = [];
        if (!parsed.productId) errors.push('productId is required');
        if (!parsed.name) errors.push('name is required');
        if (typeof parsed.price !== 'number') errors.push('price must be a number');

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
};

/**
 * Product Created With Structured Data Event Schema
 */
export const ProductCreatedWithStructuredDataSchema: EventSchema<ProductCreatedWithStructuredData> = {
    eventType: 'ProductCreatedWithStructuredData',
    version: 'v1',
    validate(data: unknown) {
        const parsed = asRecord(data) as ProductCreatedWithStructuredData;
        const errors: string[] = [];
        if (!parsed.productId) errors.push('productId is required');
        if (!parsed.sellerId) errors.push('sellerId is required');
        if (!parsed.slug) errors.push('slug is required');
        if (!parsed.categorySlug) errors.push('categorySlug is required');
        if (typeof parsed.qualityScore !== 'number') errors.push('qualityScore must be a number');

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
};

/**
 * Category Created Event Schema
 */
export const CategoryCreatedSchema: EventSchema<CategoryCreatedData> = {
    eventType: 'CategoryCreated',
    version: 'v1',
    validate(data: unknown) {
        const parsed = asRecord(data) as CategoryCreatedData;
        const errors: string[] = [];
        if (!parsed.categoryId) errors.push('categoryId is required');
        if (!parsed.name) errors.push('name is required');

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
};

// Register schemas
export const registerCatalogSchemas = () => {
    eventRegistry.register(ProductCreatedSchema);
    eventRegistry.register(ProductCreatedWithStructuredDataSchema);
    eventRegistry.register(CategoryCreatedSchema);
};
