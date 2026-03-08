import { EventSchema, eventRegistry } from './base';

interface UserRegisteredData {
    userId?: string;
    email?: string;
}

interface UserProfileUpdatedData {
    userId?: string;
    updates?: Record<string, unknown>;
}

const asRecord = (data: unknown): Record<string, unknown> =>
    typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};

/**
 * User Registered Event Schema
 */
export const UserRegisteredSchema: EventSchema<UserRegisteredData> = {
    eventType: 'UserRegistered',
    version: 'v1',
    validate(data: unknown) {
        const parsed = asRecord(data) as UserRegisteredData;
        const errors: string[] = [];
        if (!parsed.userId) errors.push('userId is required');
        if (!parsed.email) errors.push('email is required');

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
};

/**
 * User Profile Updated Event Schema
 */
export const UserProfileUpdatedSchema: EventSchema<UserProfileUpdatedData> = {
    eventType: 'UserProfileUpdated',
    version: 'v1',
    validate(data: unknown) {
        const parsed = asRecord(data) as UserProfileUpdatedData;
        const errors: string[] = [];
        if (!parsed.userId) errors.push('userId is required');
        if (!parsed.updates) errors.push('updates are required');

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
