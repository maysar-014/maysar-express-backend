import { EventSchema, eventRegistry } from './base';

/**
 * User Registered Event Schema
 */
export const UserRegisteredSchema: EventSchema = {
    eventType: 'UserRegistered',
    version: 'v1',
    validate(data: any) {
        const errors: string[] = [];
        if (!data.userId) errors.push('userId is required');
        if (!data.email) errors.push('email is required');

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
};

/**
 * User Profile Updated Event Schema
 */
export const UserProfileUpdatedSchema: EventSchema = {
    eventType: 'UserProfileUpdated',
    version: 'v1',
    validate(data: any) {
        const errors: string[] = [];
        if (!data.userId) errors.push('userId is required');
        if (!data.updates) errors.push('updates are required');

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
};

// Register schemas
export const registerUserSchemas = () => {
    eventRegistry.register(UserRegisteredSchema);
    eventRegistry.register(UserProfileUpdatedSchema);
};
