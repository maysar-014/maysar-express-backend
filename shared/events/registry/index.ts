import { registerCatalogSchemas } from './catalog.schemas';
import { registerUserSchemas } from './user.schemas';

/**
 * Initialize all event schemas in the registry
 */
export const initializeEventRegistry = () => {
    registerCatalogSchemas();
    registerUserSchemas();
    // Add other service schemas here
};
