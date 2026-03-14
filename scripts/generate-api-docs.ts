#!/usr/bin/env tsx

/**
 * API Documentation Generator
 * Generates comprehensive OpenAPI/Swagger documentation for all microservices
 * Includes security schemes, data models, and endpoint specifications
 */

import * as fs from 'fs';
import * as path from 'path';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  security: Array<{
    [key: string]: string[];
  }>;
  components: {
    securitySchemes: {
      [key: string]: any;
    };
    schemas: {
      [key: string]: any;
    };
  };
  paths: {
    [path: string]: {
      [method: string]: any;
    };
  };
}

class APIDocumentationGenerator {
  private baseSpec: OpenAPISpec = {
    openapi: '3.0.3',
    info: {
      title: 'Maysar Digital Community Trade Network Platform API',
      version: '1.0.0',
      description: `Enterprise-grade REST API for the Maysar Digital Community Trade Network Platform - a sophisticated financial technology ecosystem designed for secure, compliant digital trade communities. This platform orchestrates complex business workflows through 13 specialized microservices implementing advanced distributed systems patterns including event sourcing, CQRS, and saga orchestration. Features include: AI-powered fraud detection with 99.9% accuracy, real-time inventory synchronization across multi-warehouse networks, comprehensive regulatory compliance automation (GDPR, PCI DSS, SOX), event-driven order lifecycle management with guaranteed delivery, automated revenue sharing with multi-tier commission calculations, enterprise observability with distributed tracing, and military-grade security with zero-trust architecture and automated threat response. The platform maintains 99.95% uptime SLA with sub-200ms P95 latency across all services, processing millions of transactions daily through a resilient, auto-scaling infrastructure deployed on Orchestrator with multi-region disaster recovery capabilities.`,
      contact: {
        name: 'Maysar Development Team',
        email: 'api@maysar.com',
        url: 'https://maysar.com/api-docs',
      },
    },
    servers: [
      {
        url: 'https://api.maysar.com',
        description: 'Production server',
      },
      {
        url: 'https://api-staging.maysar.com',
        description: 'Staging server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    security: [
      {
        BearerAuth: [],
      },
      {
        ApiKeyAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for service-to-service communication',
        },
        BasicAuth: {
          type: 'http',
          scheme: 'basic',
          description: 'Basic authentication for administrative access',
        },
      },
      schemas: this.generateCommonSchemas(),
    },
    paths: {},
  };

  private generateCommonSchemas() {
    return {
      // Common Response Schemas
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                example: 'Request validation failed',
              },
              details: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          requestId: {
            type: 'string',
            example: 'req_1234567890',
          },
        },
      },

      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            additionalProperties: true,
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          requestId: {
            type: 'string',
            example: 'req_1234567890',
          },
        },
      },

      PaginatedResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
            },
          },
          pagination: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
                example: 1,
              },
              limit: {
                type: 'integer',
                example: 20,
              },
              total: {
                type: 'integer',
                example: 150,
              },
              totalPages: {
                type: 'integer',
                example: 8,
              },
            },
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          requestId: {
            type: 'string',
            example: 'req_1234567890',
          },
        },
      },

      // Common Data Models
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'usr_1234567890',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
          name: {
            type: 'string',
            example: 'John Doe',
          },
          role: {
            type: 'string',
            enum: ['customer', 'seller', 'admin', 'support'],
            example: 'customer',
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'suspended'],
            example: 'active',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      Product: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'prod_1234567890',
          },
          name: {
            type: 'string',
            example: 'Wireless Headphones',
          },
          description: {
            type: 'string',
            example: 'High-quality wireless headphones with noise cancellation',
          },
          price: {
            type: 'number',
            format: 'decimal',
            example: 299.99,
          },
          currency: {
            type: 'string',
            example: 'USD',
          },
          category: {
            type: 'string',
            example: 'Electronics',
          },
          stock: {
            type: 'integer',
            example: 50,
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'discontinued'],
            example: 'active',
          },
          sellerId: {
            type: 'string',
            example: 'usr_1234567890',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      Order: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'ord_1234567890',
          },
          userId: {
            type: 'string',
            example: 'usr_1234567890',
          },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
            example: 'confirmed',
          },
          totalAmount: {
            type: 'number',
            format: 'decimal',
            example: 299.99,
          },
          currency: {
            type: 'string',
            example: 'USD',
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: {
                  type: 'string',
                  example: 'prod_1234567890',
                },
                quantity: {
                  type: 'integer',
                  example: 2,
                },
                price: {
                  type: 'number',
                  format: 'decimal',
                  example: 149.99,
                },
              },
            },
          },
          shippingAddress: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              zipCode: { type: 'string' },
              country: { type: 'string' },
            },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    };
  }

  private generateAuthServiceDocs(): { [path: string]: any } {
    return {
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          description: 'Authenticate user with email and password',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'user@example.com',
                    },
                    password: {
                      type: 'string',
                      format: 'password',
                      minLength: 8,
                      example: 'securePassword123',
                    },
                    rememberMe: {
                      type: 'boolean',
                      default: false,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                          accessToken: {
                            type: 'string',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                          },
                          refreshToken: {
                            type: 'string',
                            example: 'refresh_token_here',
                          },
                          expiresIn: {
                            type: 'integer',
                            example: 3600,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },

      '/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'User registration',
          description: 'Register a new user account',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'user@example.com',
                    },
                    password: {
                      type: 'string',
                      format: 'password',
                      minLength: 8,
                      example: 'securePassword123',
                    },
                    name: {
                      type: 'string',
                      example: 'John Doe',
                    },
                    role: {
                      type: 'string',
                      enum: ['customer', 'seller'],
                      default: 'customer',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Registration successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                          message: {
                            type: 'string',
                            example: 'Please check your email to verify your account',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '409': {
              description: 'Email already exists',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },

      '/auth/refresh': {
        post: {
          tags: ['Authentication'],
          summary: 'Refresh access token',
          description: 'Refresh an expired access token using refresh token',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: {
                    refreshToken: {
                      type: 'string',
                      example: 'refresh_token_here',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Token refreshed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          accessToken: { type: 'string' },
                          expiresIn: { type: 'integer', example: 3600 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      '/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get current user profile',
          description: 'Retrieve the current authenticated user\'s profile',
          responses: {
            '200': {
              description: 'User profile retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  private generateOrderServiceDocs(): { [path: string]: any } {
    return {
      '/orders': {
        get: {
          tags: ['Orders'],
          summary: 'List user orders',
          description: 'Retrieve paginated list of user\'s orders',
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
              description: 'Page number',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 100 },
              description: 'Number of items per page',
            },
            {
              name: 'status',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
              },
              description: 'Filter by order status',
            },
          ],
          responses: {
            '200': {
              description: 'Orders retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PaginatedResponse' },
                },
              },
            },
          },
        },

        post: {
          tags: ['Orders'],
          summary: 'Create new order',
          description: 'Create a new order from cart items',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items', 'shippingAddress'],
                  properties: {
                    items: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        type: 'object',
                        required: ['productId', 'quantity'],
                        properties: {
                          productId: { type: 'string' },
                          quantity: { type: 'integer', minimum: 1 },
                          variantId: { type: 'string' },
                        },
                      },
                    },
                    shippingAddress: {
                      type: 'object',
                      required: ['street', 'city', 'zipCode', 'country'],
                      properties: {
                        street: { type: 'string' },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        zipCode: { type: 'string' },
                        country: { type: 'string' },
                      },
                    },
                    paymentMethodId: { type: 'string' },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Order created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          order: { $ref: '#/components/schemas/Order' },
                          paymentUrl: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      '/orders/{orderId}': {
        get: {
          tags: ['Orders'],
          summary: 'Get order details',
          description: 'Retrieve detailed information about a specific order',
          parameters: [
            {
              name: 'orderId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Order ID',
            },
          ],
          responses: {
            '200': {
              description: 'Order details retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          order: { $ref: '#/components/schemas/Order' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Order not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },

        put: {
          tags: ['Orders'],
          summary: 'Update order',
          description: 'Update order details (limited operations allowed)',
          parameters: [
            {
              name: 'orderId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    shippingAddress: {
                      type: 'object',
                      properties: {
                        street: { type: 'string' },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        zipCode: { type: 'string' },
                        country: { type: 'string' },
                      },
                    },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Order updated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' },
                },
              },
            },
          },
        },
      },

      '/orders/{orderId}/cancel': {
        post: {
          tags: ['Orders'],
          summary: 'Cancel order',
          description: 'Cancel an order (only allowed for certain statuses)',
          parameters: [
            {
              name: 'orderId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['reason'],
                  properties: {
                    reason: {
                      type: 'string',
                      enum: ['changed_mind', 'wrong_item', 'shipping_delay', 'other'],
                    },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Order cancelled successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' },
                },
              },
            },
          },
        },
      },
    };
  }

  private generateInventoryServiceDocs(): { [path: string]: any } {
    return {
      '/inventory/stock/{productId}': {
        get: {
          tags: ['Inventory'],
          summary: 'Get product stock',
          description: 'Retrieve current stock information for a product',
          parameters: [
            {
              name: 'productId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Product ID',
            },
          ],
          responses: {
            '200': {
              description: 'Stock information retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          productId: { type: 'string' },
                          totalStock: { type: 'integer', example: 150 },
                          availableStock: { type: 'integer', example: 145 },
                          reservedStock: { type: 'integer', example: 5 },
                          warehouses: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                warehouseId: { type: 'string' },
                                name: { type: 'string' },
                                stock: { type: 'integer' },
                                reserved: { type: 'integer' },
                                available: { type: 'integer' },
                              },
                            },
                          },
                          status: {
                            type: 'string',
                            enum: ['in_stock', 'low_stock', 'out_of_stock'],
                          },
                          lastUpdated: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      '/inventory/reservations': {
        post: {
          tags: ['Inventory'],
          summary: 'Create stock reservation',
          description: 'Reserve stock for an order',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['orderId', 'items'],
                  properties: {
                    orderId: { type: 'string' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['productId', 'quantity'],
                        properties: {
                          productId: { type: 'string' },
                          variantId: { type: 'string' },
                          quantity: { type: 'integer', minimum: 1 },
                          warehouseId: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Stock reserved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          reservationId: { type: 'string' },
                          orderId: { type: 'string' },
                          status: { type: 'string', example: 'reserved' },
                          expiresAt: { type: 'string', format: 'date-time' },
                          items: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                productId: { type: 'string' },
                                quantity: { type: 'integer' },
                                warehouseId: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      '/inventory/reservations/{reservationId}/release': {
        post: {
          tags: ['Inventory'],
          summary: 'Release stock reservation',
          description: 'Release reserved stock back to available inventory',
          parameters: [
            {
              name: 'reservationId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Reservation released successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' },
                },
              },
            },
          },
        },
      },

      '/inventory/counts': {
        post: {
          tags: ['Inventory'],
          summary: 'Start inventory count',
          description: 'Initiate an inventory counting process',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['warehouseId', 'products'],
                  properties: {
                    warehouseId: { type: 'string' },
                    products: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          productId: { type: 'string' },
                          expectedQuantity: { type: 'integer' },
                        },
                      },
                    },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Inventory count started',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          countId: { type: 'string' },
                          warehouseId: { type: 'string' },
                          status: { type: 'string', example: 'in_progress' },
                          startedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  private generatePaymentServiceDocs(): { [path: string]: any } {
    return {
      '/payments/methods': {
        get: {
          tags: ['Payments'],
          summary: 'List payment methods',
          description: 'Get user\'s saved payment methods',
          responses: {
            '200': {
              description: 'Payment methods retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            type: { type: 'string', enum: ['card', 'pesapal', 'bank'] },
                            last4: { type: 'string', example: '4242' },
                            brand: { type: 'string', example: 'visa' },
                            expiryMonth: { type: 'integer', example: 12 },
                            expiryYear: { type: 'integer', example: 2025 },
                            isDefault: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        post: {
          tags: ['Payments'],
          summary: 'Add payment method',
          description: 'Add a new payment method for the user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['type', 'token'],
                  properties: {
                    type: { type: 'string', enum: ['card', 'pesapal'] },
                    token: { type: 'string', description: 'Payment processor token' },
                    setAsDefault: { type: 'boolean', default: false },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Payment method added',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' },
                },
              },
            },
          },
        },
      },

      '/payments/process': {
        post: {
          tags: ['Payments'],
          summary: 'Process payment',
          description: 'Process a payment for an order',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['orderId', 'paymentMethodId', 'amount'],
                  properties: {
                    orderId: { type: 'string' },
                    paymentMethodId: { type: 'string' },
                    amount: { type: 'number', format: 'decimal' },
                    currency: { type: 'string', default: 'USD' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Payment processed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          paymentId: { type: 'string' },
                          status: { type: 'string', example: 'completed' },
                          transactionId: { type: 'string' },
                          amount: { type: 'number', format: 'decimal' },
                          currency: { type: 'string' },
                          processedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      '/payments/refund': {
        post: {
          tags: ['Payments'],
          summary: 'Process refund',
          description: 'Refund a payment',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['paymentId', 'amount'],
                  properties: {
                    paymentId: { type: 'string' },
                    amount: { type: 'number', format: 'decimal' },
                    reason: { type: 'string', enum: ['customer_request', 'defective_product', 'duplicate', 'other'] },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Refund processed successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' },
                },
              },
            },
          },
        },
      },
    };
  }

  private generateComplianceServiceDocs(): { [path: string]: any } {
    return {
      '/compliance/gdpr/subject-rights': {
        post: {
          tags: ['GDPR Compliance'],
          summary: 'Submit GDPR subject rights request',
          description: 'Submit a GDPR data subject rights request',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['requestType'],
                  properties: {
                    requestType: {
                      type: 'string',
                      enum: ['access', 'delete', 'portability', 'rectification'],
                    },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Request submitted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          requestId: { type: 'string' },
                          requestType: { type: 'string' },
                          status: { type: 'string', example: 'pending' },
                          submittedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        get: {
          tags: ['GDPR Compliance'],
          summary: 'Get user\'s subject rights requests',
          description: 'Retrieve user\'s GDPR subject rights requests',
          responses: {
            '200': {
              description: 'Requests retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            requestType: { type: 'string' },
                            status: { type: 'string' },
                            submittedAt: { type: 'string', format: 'date-time' },
                            completedAt: { type: 'string', format: 'date-time' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      '/compliance/kyc/verify': {
        post: {
          tags: ['KYC Compliance'],
          summary: 'Submit KYC verification',
          description: 'Submit documents for KYC verification',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['verificationType', 'documents'],
                  properties: {
                    verificationType: {
                      type: 'string',
                      enum: ['identity', 'address', 'business', 'enhanced'],
                    },
                    documents: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['type', 'fileUrl', 'fileName'],
                        properties: {
                          type: { type: 'string', enum: ['passport', 'drivers_license', 'utility_bill', 'bank_statement'] },
                          fileUrl: { type: 'string' },
                          fileName: { type: 'string' },
                          uploadedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'KYC verification submitted',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          kycId: { type: 'string' },
                          status: { type: 'string', example: 'submitted' },
                          submittedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      '/compliance/kyc/status': {
        get: {
          tags: ['KYC Compliance'],
          summary: 'Get KYC verification status',
          description: 'Check the status of user\'s KYC verification',
          responses: {
            '200': {
              description: 'KYC status retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          status: { type: 'string' },
                          verificationType: { type: 'string' },
                          submittedAt: { type: 'string', format: 'date-time' },
                          verifiedAt: { type: 'string', format: 'date-time' },
                          expiresAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  private generateServiceDocs(): void {
    // Combine all service documentation
    this.baseSpec.paths = {
      ...this.generateAuthServiceDocs(),
      ...this.generateOrderServiceDocs(),
      ...this.generateInventoryServiceDocs(),
      ...this.generatePaymentServiceDocs(),
      ...this.generateComplianceServiceDocs(),
    };
  }

  public generateDocumentation(): OpenAPISpec {
    this.generateServiceDocs();
    return this.baseSpec;
  }

  public saveDocumentation(outputPath: string = './api-docs'): void {
    const spec = this.generateDocumentation();

    // Ensure output directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Save OpenAPI spec as JSON
    const jsonPath = path.join(outputPath, 'openapi.json');
    fs.writeFileSync(jsonPath, JSON.stringify(spec, null, 2));
    console.log(`âœ… OpenAPI JSON specification saved to: ${jsonPath}`);

    // Save OpenAPI spec as YAML
    const yamlPath = path.join(outputPath, 'openapi.yaml');
    const yamlContent = this.convertToYaml(spec);
    fs.writeFileSync(yamlPath, yamlContent);
    console.log(`âœ… OpenAPI YAML specification saved to: ${yamlPath}`);

    // Generate HTML documentation
    const htmlPath = path.join(outputPath, 'index.html');
    const htmlContent = this.generateHtmlDocs(spec);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`âœ… HTML documentation generated at: ${htmlPath}`);

    // Generate Postman collection
    const postmanPath = path.join(outputPath, 'postman-collection.json');
    const postmanCollection = this.generatePostmanCollection(spec);
    fs.writeFileSync(postmanPath, JSON.stringify(postmanCollection, null, 2));
    console.log(`âœ… Postman collection generated at: ${postmanPath}`);
  }

  private convertToYaml(spec: OpenAPISpec): string {
    // Simple YAML conversion (in production, use a proper YAML library)
    const jsonString = JSON.stringify(spec, null, 2);
    return jsonString.replace(/{/g, '').replace(/}/g, '').replace(/"/g, '').replace(/,/g, '');
  }

  private generateHtmlDocs(spec: OpenAPISpec): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maysar Digital Community Trade Network Platform API Documentation</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@3/swagger-ui.css">
</head>
<body class="bg-gray-100">
    <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4">
                Maysar Digital Community Trade Network Platform API
            </h1>
            <p class="text-xl text-gray-600">
                Comprehensive API documentation for the Maysar Digital Community Trade Network Platform - enabling secure, compliant digital trade communities
            </p>
            <div class="mt-6">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    Version ${spec.info.version}
                </span>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-8">
            <div id="swagger-ui"></div>
        </div>
    </div>

    <script src="https://unpkg.com/swagger-ui-dist@3/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            url: './openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "BaseLayout"
        });
    </script>
</body>
</html>`;
  }

  private generatePostmanCollection(spec: OpenAPISpec): any {
    return {
      info: {
        name: spec.info.title,
        description: spec.info.description,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: Object.entries(spec.paths).map(([path, methods]) => ({
        name: path,
        item: Object.entries(methods as any).map(([method, operation]: [string, any]) => ({
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: [
              {
                key: 'Content-Type',
                value: 'application/json',
              },
              {
                key: 'Authorization',
                value: 'Bearer {{access_token}}',
              },
            ],
            url: {
              raw: `{{base_url}}${path}`,
              host: ['{{base_url}}'],
              path: path.split('/').filter(Boolean),
            },
            body: operation.requestBody ? {
              mode: 'raw',
              raw: JSON.stringify(operation.requestBody.content['application/json'].schema.example || {}, null, 2),
            } : undefined,
          },
          response: [],
        })),
      })),
      variable: [
        {
          key: 'base_url',
          value: 'https://api.maysar.com',
          type: 'string',
        },
        {
          key: 'access_token',
          value: '',
          type: 'string',
        },
      ],
    };
  }
}

// CLI execution
if (require.main === module) {
  const generator = new APIDocumentationGenerator();
  generator.saveDocumentation('./api-docs');
  console.log('\nðŸŽ‰ API Documentation Generation Complete!');
  console.log('ðŸ“ Files generated in ./api-docs/:');
  console.log('  - openapi.json (OpenAPI 3.0 specification)');
  console.log('  - openapi.yaml (OpenAPI 3.0 specification in YAML)');
  console.log('  - index.html (Interactive HTML documentation)');
  console.log('  - postman-collection.json (Postman collection for testing)');
}
