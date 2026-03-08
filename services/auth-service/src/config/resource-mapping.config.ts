/**
 * Resource Mapping Configuration
 * Professional resource-action mapping for authorization system
 * Maps business resources to their corresponding API endpoints and services
 * 
 * @author Maysar Express Security Team
 * @version 2.0.0
 */

// =====================================================================================
// RESOURCE DEFINITIONS
// =====================================================================================

/**
 * Resource Action Types
 */
export type ResourceAction = 
  | 'create' | 'read' | 'update' | 'delete' | 'view' | 'list'
  | 'approve' | 'reject' | 'cancel' | 'complete' | 'archive'
  | 'publish' | 'unpublish' | 'moderate' | 'review'
  | 'assign' | 'transfer' | 'manage' | 'configure'
  | 'export' | 'import' | 'generate' | 'download' | 'upload';

/**
 * Resource Scope Types
 */
export type ResourceScope = 
  | 'own' | 'team' | 'department' | 'organization' | 'global'
  | 'public' | 'private' | 'restricted' | 'supplier' | 'enabler';

/**
 * Resource Category Types
 */
export type ResourceCategory = 
  | 'core' | 'business' | 'admin' | 'system' | 'integration';

/**
 * Resource Mapping Entry
 */
export interface ResourceMapping {
  resource: string;
  category: ResourceCategory;
  description: string;
  endpoints: EndpointMapping[];
  services: ServiceMapping[];
  dependencies?: string[];
  metadata?: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    auditRequired: boolean;
    requiresMFA: boolean;
    businessJustification?: string;
  };
}

/**
 * Endpoint Mapping
 */
export interface EndpointMapping {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  path: string;
  actions: ResourceAction[];
  scope: ResourceScope[];
  description: string;
  microservice: string;
  version: string;
}

/**
 * Service Mapping
 */
export interface ServiceMapping {
  serviceName: string;
  serviceType: 'api' | 'worker' | 'event' | 'integration';
  operations: string[];
  description: string;
  dependencies?: string[];
}

// =====================================================================================
// RESOURCE MAPPINGS
// =====================================================================================

/**
 * Core Business Resources
 */
export const CORE_RESOURCES: ResourceMapping[] = [
  {
    resource: 'products',
    category: 'business',
    description: 'Product catalog and inventory management',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/products',
        actions: ['list', 'view'],
        scope: ['public', 'own', 'organization'],
        description: 'List products with filtering and pagination',
        microservice: 'catalog-service',
        version: 'v1'
      },
      {
        method: 'GET',
        path: '/api/v1/products/:id',
        actions: ['view'],
        scope: ['public', 'own', 'organization'],
        description: 'Get product details by ID',
        microservice: 'catalog-service',
        version: 'v1'
      },
      {
        method: 'POST',
        path: '/api/v1/products',
        actions: ['create'],
        scope: ['own', 'organization'],
        description: 'Create new product',
        microservice: 'catalog-service',
        version: 'v1'
      },
      {
        method: 'PUT',
        path: '/api/v1/products/:id',
        actions: ['update'],
        scope: ['own', 'organization'],
        description: 'Update product details',
        microservice: 'catalog-service',
        version: 'v1'
      },
      {
        method: 'DELETE',
        path: '/api/v1/products/:id',
        actions: ['delete'],
        scope: ['own', 'organization'],
        description: 'Delete product',
        microservice: 'catalog-service',
        version: 'v1'
      },
      {
        method: 'POST',
        path: '/api/v1/products/:id/publish',
        actions: ['publish'],
        scope: ['own', 'organization'],
        description: 'Publish product to marketplace',
        microservice: 'catalog-service',
        version: 'v1'
      },
      {
        method: 'POST',
        path: '/api/v1/products/:id/unpublish',
        actions: ['unpublish'],
        scope: ['own', 'organization'],
        description: 'Unpublish product from marketplace',
        microservice: 'catalog-service',
        version: 'v1'
      }
    ],
    services: [
      {
        serviceName: 'ProductService',
        serviceType: 'api',
        operations: ['createProduct', 'getProduct', 'updateProduct', 'deleteProduct', 'listProducts'],
        description: 'Core product management operations'
      },
      {
        serviceName: 'ProductSearchService',
        serviceType: 'api',
        operations: ['searchProducts', 'filterProducts', 'getProductRecommendations'],
        description: 'Product search and discovery'
      },
      {
        serviceName: 'ProductInventoryService',
        serviceType: 'api',
        operations: ['updateInventory', 'checkAvailability', 'reserveStock'],
        description: 'Product inventory management'
      }
    ],
    metadata: {
      riskLevel: 'medium',
      auditRequired: true,
      requiresMFA: false,
      businessJustification: 'Core business functionality for product catalog'
    }
  },
  {
    resource: 'orders',
    category: 'business',
    description: 'Order management and fulfillment',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/orders',
        actions: ['list', 'view'],
        scope: ['own', 'supplier', 'enabler', 'organization'],
        description: 'List orders with filtering',
        microservice: 'order-service',
        version: 'v1'
      },
      {
        method: 'GET',
        path: '/api/v1/orders/:id',
        actions: ['view'],
        scope: ['own', 'supplier', 'enabler', 'organization'],
        description: 'Get order details',
        microservice: 'order-service',
        version: 'v1'
      },
      {
        method: 'POST',
        path: '/api/v1/orders',
        actions: ['create'],
        scope: ['own'],
        description: 'Create new order',
        microservice: 'order-service',
        version: 'v1'
      },
      {
        method: 'PUT',
        path: '/api/v1/orders/:id/status',
        actions: ['update', 'cancel', 'complete'],
        scope: ['own', 'supplier', 'organization'],
        description: 'Update order status',
        microservice: 'order-service',
        version: 'v1'
      },
      {
        method: 'POST',
        path: '/api/v1/orders/:id/cancel',
        actions: ['cancel'],
        scope: ['own', 'organization'],
        description: 'Cancel order',
        microservice: 'order-service',
        version: 'v1'
      }
    ],
    services: [
      {
        serviceName: 'OrderService',
        serviceType: 'api',
        operations: ['createOrder', 'getOrder', 'updateOrder', 'cancelOrder', 'listOrders'],
        description: 'Core order management operations'
      },
      {
        serviceName: 'OrderFulfillmentService',
        serviceType: 'worker',
        operations: ['processOrder', 'updateOrderStatus', 'notifyOrderStatus'],
        description: 'Order fulfillment and status updates'
      }
    ],
    metadata: {
      riskLevel: 'high',
      auditRequired: true,
      requiresMFA: true,
      businessJustification: 'Financial transactions and customer data'
    }
  },
  {
    resource: 'suppliers',
    category: 'business',
    description: 'Supplier and vendor management',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/suppliers',
        actions: ['list', 'view'],
        scope: ['public', 'own', 'organization'],
        description: 'List suppliers',
        microservice: 'supplier-service',
        version: 'v1'
      },
      {
        method: 'GET',
        path: '/api/v1/suppliers/:id',
        actions: ['view'],
        scope: ['public', 'own', 'organization'],
        description: 'Get supplier details',
        microservice: 'supplier-service',
        version: 'v1'
      },
      {
        method: 'POST',
        path: '/api/v1/suppliers',
        actions: ['create'],
        scope: ['own', 'organization'],
        description: 'Create supplier',
        microservice: 'supplier-service',
        version: 'v1'
      },
      {
        method: 'PUT',
        path: '/api/v1/suppliers/:id',
        actions: ['update'],
        scope: ['own', 'organization'],
        description: 'Update supplier',
        microservice: 'supplier-service',
        version: 'v1'
      }
    ],
    services: [
      {
        serviceName: 'SupplierService',
        serviceType: 'api',
        operations: ['createSupplier', 'getSupplier', 'updateSupplier', 'listSuppliers'],
        description: 'Supplier management operations'
      }
    ],
    metadata: {
      riskLevel: 'medium',
      auditRequired: true,
      requiresMFA: false,
      businessJustification: 'Business partner management'
    }
  },
  {
    resource: 'enablers',
    category: 'business',
    description: 'Service enabler and partner management',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/enablers',
        actions: ['list', 'view'],
        scope: ['public', 'own', 'organization'],
        description: 'List enablers',
        microservice: 'enabler-service',
        version: 'v1'
      },
      {
        method: 'GET',
        path: '/api/v1/enablers/:id',
        actions: ['view'],
        scope: ['public', 'own', 'organization'],
        description: 'Get enabler details',
        microservice: 'enabler-service',
        version: 'v1'
      },
      {
        method: 'POST',
        path: '/api/v1/enablers',
        actions: ['create'],
        scope: ['own', 'organization'],
        description: 'Create enabler',
        microservice: 'enabler-service',
        version: 'v1'
      },
      {
        method: 'PUT',
        path: '/api/v1/enablers/:id',
        actions: ['update'],
        scope: ['own', 'organization'],
        description: 'Update enabler',
        microservice: 'enabler-service',
        version: 'v1'
      }
    ],
    services: [
      {
        serviceName: 'EnablerService',
        serviceType: 'api',
        operations: ['createEnabler', 'getEnabler', 'updateEnabler', 'listEnablers'],
        description: 'Enabler management operations'
      }
    ],
    metadata: {
      riskLevel: 'medium',
      auditRequired: true,
      requiresMFA: false,
      businessJustification: 'Service partner management'
    }
  }
];

/**
 * User and Profile Resources
 */
export const USER_RESOURCES: ResourceMapping[] = [
  {
    resource: 'profile',
    category: 'core',
    description: 'User profile and account management',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/profile',
        actions: ['view'],
        scope: ['own'],
        description: 'Get user profile',
        microservice: 'user-service',
        version: 'v1'
      },
      {
        method: 'PUT',
        path: '/api/v1/profile',
        actions: ['update'],
        scope: ['own'],
        description: 'Update user profile',
        microservice: 'user-service',
        version: 'v1'
      },
      {
        method: 'POST',
        path: '/api/v1/profile/avatar',
        actions: ['update', 'upload'],
        scope: ['own'],
        description: 'Upload profile avatar',
        microservice: 'user-service',
        version: 'v1'
      }
    ],
    services: [
      {
        serviceName: 'UserProfileService',
        serviceType: 'api',
        operations: ['getUserProfile', 'updateUserProfile', 'uploadAvatar'],
        description: 'User profile management'
      }
    ],
    metadata: {
      riskLevel: 'high',
      auditRequired: true,
      requiresMFA: true,
      businessJustification: 'Personal user data and account security'
    }
  },
  {
    resource: 'users',
    category: 'admin',
    description: 'User administration and management',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/users',
        actions: ['list', 'view'],
        scope: ['organization'],
        description: 'List users',
        microservice: 'user-service',
        version: 'v1'
      },
      {
        method: 'GET',
        path: '/api/v1/users/:id',
        actions: ['view'],
        scope: ['organization'],
        description: 'Get user details',
        microservice: 'user-service',
        version: 'v1'
      },
      {
        method: 'POST',
        path: '/api/v1/users',
        actions: ['create'],
        scope: ['organization'],
        description: 'Create user',
        microservice: 'user-service',
        version: 'v1'
      },
      {
        method: 'PUT',
        path: '/api/v1/users/:id',
        actions: ['update'],
        scope: ['organization'],
        description: 'Update user',
        microservice: 'user-service',
        version: 'v1'
      },
      {
        method: 'DELETE',
        path: '/api/v1/users/:id',
        actions: ['delete'],
        scope: ['organization'],
        description: 'Delete user',
        microservice: 'user-service',
        version: 'v1'
      }
    ],
    services: [
      {
        serviceName: 'UserAdminService',
        serviceType: 'api',
        operations: ['createUser', 'getUser', 'updateUser', 'deleteUser', 'listUsers'],
        description: 'User administration operations'
      }
    ],
    metadata: {
      riskLevel: 'critical',
      auditRequired: true,
      requiresMFA: true,
      businessJustification: 'System administration and user management'
    }
  }
];

/**
 * System and Administrative Resources
 */
export const SYSTEM_RESOURCES: ResourceMapping[] = [
  {
    resource: 'system',
    category: 'system',
    description: 'System administration and configuration',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/system/status',
        actions: ['view'],
        scope: ['organization'],
        description: 'Get system status',
        microservice: 'system-service',
        version: 'v1'
      },
      {
        method: 'POST',
        path: '/api/v1/system/maintenance',
        actions: ['manage'],
        scope: ['organization'],
        description: 'System maintenance operations',
        microservice: 'system-service',
        version: 'v1'
      },
      {
        method: 'GET',
        path: '/api/v1/system/config',
        actions: ['view'],
        scope: ['organization'],
        description: 'Get system configuration',
        microservice: 'system-service',
        version: 'v1'
      },
      {
        method: 'PUT',
        path: '/api/v1/system/config',
        actions: ['manage', 'configure'],
        scope: ['organization'],
        description: 'Update system configuration',
        microservice: 'system-service',
        version: 'v1'
      }
    ],
    services: [
      {
        serviceName: 'SystemAdminService',
        serviceType: 'api',
        operations: ['getSystemStatus', 'performMaintenance', 'getSystemConfig', 'updateSystemConfig'],
        description: 'System administration operations'
      }
    ],
    metadata: {
      riskLevel: 'critical',
      auditRequired: true,
      requiresMFA: true,
      businessJustification: 'System-level administration and configuration'
    }
  },
  {
    resource: 'inventory',
    category: 'business',
    description: 'Inventory management and tracking',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/inventory',
        actions: ['list', 'view'],
        scope: ['own', 'organization'],
        description: 'List inventory',
        microservice: 'inventory-service',
        version: 'v1'
      },
      {
        method: 'GET',
        path: '/api/v1/inventory/:id',
        actions: ['view'],
        scope: ['own', 'organization'],
        description: 'Get inventory details',
        microservice: 'inventory-service',
        version: 'v1'
      },
      {
        method: 'PUT',
        path: '/api/v1/inventory/:id',
        actions: ['update'],
        scope: ['own', 'organization'],
        description: 'Update inventory',
        microservice: 'inventory-service',
        version: 'v1'
      }
    ],
    services: [
      {
        serviceName: 'InventoryService',
        serviceType: 'api',
        operations: ['getInventory', 'updateInventory', 'listInventory'],
        description: 'Inventory management operations'
      }
    ],
    metadata: {
      riskLevel: 'medium',
      auditRequired: true,
      requiresMFA: false,
      businessJustification: 'Product inventory tracking and management'
    }
  }
];

// =====================================================================================
// RESOURCE MAPPING MANAGER
// =====================================================================================

/**
 * Resource Mapping Manager
 * Provides methods to resolve resources to their corresponding endpoints and services
 */
export class ResourceMappingManager {
  private static instance: ResourceMappingManager;
  private resourceMappings: Map<string, ResourceMapping> = new Map();

  private constructor() {
    this.loadResourceMappings();
  }

  public static getInstance(): ResourceMappingManager {
    if (!this.instance) {
      this.instance = new ResourceMappingManager();
    }
    return this.instance;
  }

  private loadResourceMappings(): void {
    const allMappings = [
      ...CORE_RESOURCES,
      ...USER_RESOURCES,
      ...SYSTEM_RESOURCES
    ];

    allMappings.forEach(mapping => {
      this.resourceMappings.set(mapping.resource, mapping);
    });
  }

  /**
   * Get resource mapping by resource name
   */
  public getResourceMapping(resource: string): ResourceMapping | undefined {
    return this.resourceMappings.get(resource);
  }

  /**
   * Get all resource mappings
   */
  public getAllResourceMappings(): ResourceMapping[] {
    return Array.from(this.resourceMappings.values());
  }

  /**
   * Get endpoints for a specific resource and action
   */
  public getEndpointsForResource(resource: string, action: ResourceAction): EndpointMapping[] {
    const mapping = this.getResourceMapping(resource);
    if (!mapping) return [];

    return mapping.endpoints.filter(endpoint => 
      endpoint.actions.includes(action)
    );
  }

  /**
   * Get services for a specific resource
   */
  public getServicesForResource(resource: string): ServiceMapping[] {
    const mapping = this.getResourceMapping(resource);
    if (!mapping) return [];

    return mapping.services;
  }

  /**
   * Validate permission against resource mapping
   */
  public validatePermission(resource: string, action: ResourceAction, scope: ResourceScope): boolean {
    const mapping = this.getResourceMapping(resource);
    if (!mapping) return false;

    const validEndpoints = this.getEndpointsForResource(resource, action);
    return validEndpoints.some(endpoint => endpoint.scope.includes(scope));
  }

  /**
   * Get resource metadata for risk assessment
   */
  public getResourceMetadata(resource: string): ResourceMapping['metadata'] | undefined {
    const mapping = this.getResourceMapping(resource);
    return mapping?.metadata;
  }

  /**
   * Get microservice for a specific endpoint
   */
  public getMicroserviceForEndpoint(path: string, method: string): string | undefined {
    for (const mapping of this.resourceMappings.values()) {
      const endpoint = mapping.endpoints.find(ep => 
        ep.path === path && ep.method === (method as any)
      );
      if (endpoint) return endpoint.microservice;
    }
    return undefined;
  }

  /**
   * Get all actions available for a resource
   */
  public getAvailableActionsForResource(resource: string): ResourceAction[] {
    const mapping = this.getResourceMapping(resource);
    if (!mapping) return [];

    const actions = new Set<ResourceAction>();
    mapping.endpoints.forEach(endpoint => {
      endpoint.actions.forEach(action => actions.add(action));
    });
    return Array.from(actions);
  }

  /**
   * Get all scopes available for a resource and action
   */
  public getAvailableScopesForResource(resource: string, action: ResourceAction): ResourceScope[] {
    const mapping = this.getResourceMapping(resource);
    if (!mapping) return [];

    const scopes = new Set<ResourceScope>();
    mapping.endpoints
      .filter(endpoint => endpoint.actions.includes(action))
      .forEach(endpoint => {
        endpoint.scope.forEach(scope => scopes.add(scope));
      });
    return Array.from(scopes);
  }
}

// =====================================================================================
// EXPORTS
// =====================================================================================

export const resourceMappingManager = ResourceMappingManager.getInstance();
