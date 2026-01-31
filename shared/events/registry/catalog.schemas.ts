import { EventSchema, eventRegistry } from './base';

/**
 * Product Created Event Schema
 */
export const ProductCreatedSchema: EventSchema = {
    eventType: 'ProductCreated',
    version: 'v1',
    validate(data: any) {
        const errors: string[] = [];
        if (!data.productId) errors.push('productId is required');
        if (!data.name) errors.push('name is required');
        if (typeof data.price !== 'number') errors.push('price must be a number');

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
};

/**
 * Category Created Event Schema
 */
export const CategoryCreatedSchema: EventSchema = {
    eventType: 'CategoryCreated',
    version: 'v1',
    validate(data: any) {
        const errors: string[] = [];
        if (!data.categoryId) errors.push('categoryId is required');
        if (!data.name) errors.push('name is required');

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
};

// Register schemas
export const registerCatalogSchemas = () => {
    eventRegistry.register(ProductCreatedSchema);
    eventRegistry.register(CategoryCreatedSchema);
};
