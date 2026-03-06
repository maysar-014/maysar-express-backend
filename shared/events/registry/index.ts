import { registerCatalogSchemas } from './catalog.schemas';
import { registerUserSchemas } from './user.schemas';
import { registerComplianceSchemas } from './compliance.schemas';

/**
 * Initialize all event schemas in the registry
 */
export const initializeEventRegistry = () => {
    registerCatalogSchemas();
    registerUserSchemas();
    registerComplianceSchemas();
    // Add other service schemas here
};
