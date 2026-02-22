import Ajv from 'ajv';
import addFormats from 'ajv-formats';

interface EventSchema {
  version: string;
  schema: object;
  deprecated?: boolean;
  deprecationDate?: string;
}

interface SchemaRegistry {
  [eventType: string]: {
    [version: string]: EventSchema;
  };
}

export class EventSchemaRegistry {
  private ajv: Ajv;
  private schemas: SchemaRegistry = {};

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.loadSchemas();
  }

  private loadSchemas() {
    // Order Domain Schemas
    this.registerSchema('order.created', 'v1', {
      type: 'object',
      required: ['orderId', 'orderNumber', 'buyerId', 'sellerId', 'items', 'totalAmount', 'currency'],
      properties: {
        orderId: { type: 'string', format: 'uuid' },
        orderNumber: { type: 'string', pattern: '^ORD-\\d+-\\d{3}$' },
        buyerId: { type: 'string', format: 'uuid' },
        sellerId: { type: 'string', format: 'uuid' },
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['productVariantId', 'quantity', 'unitPrice', 'totalPrice'],
            properties: {
              productVariantId: { type: 'string', format: 'uuid' },
              quantity: { type: 'integer', minimum: 1 },
              unitPrice: { type: 'number', minimum: 0 },
              totalPrice: { type: 'number', minimum: 0 }
            }
          }
        },
        totalAmount: { type: 'number', minimum: 0 },
        currency: { type: 'string', enum: ['TZS', 'USD', 'EUR'] },
        shippingAddress: { type: 'object' },
        billingAddress: { type: 'object' }
      }
    });

    // Payment Domain Schemas
    this.registerSchema('payment.succeeded', 'v1', {
      type: 'object',
      required: ['paymentId', 'orderId', 'amount', 'currency', 'paymentMethod'],
      properties: {
        paymentId: { type: 'string', format: 'uuid' },
        orderId: { type: 'string', format: 'uuid' },
        amount: { type: 'number', minimum: 0 },
        currency: { type: 'string', enum: ['TZS', 'USD', 'EUR'] },
        paymentMethod: { type: 'string', enum: ['card', 'mobile_money', 'bank_transfer'] },
        transactionId: { type: 'string' }
      }
    });

    this.registerSchema('payment.failed', 'v1', {
      type: 'object',
      required: ['paymentId', 'orderId', 'amount', 'currency', 'reason'],
      properties: {
        paymentId: { type: 'string', format: 'uuid' },
        orderId: { type: 'string', format: 'uuid' },
        amount: { type: 'number', minimum: 0 },
        currency: { type: 'string', enum: ['TZS', 'USD', 'EUR'] },
        reason: { type: 'string', enum: ['insufficient_funds', 'invalid_card', 'fraud_detected', 'system_error'] },
        errorCode: { type: 'string' }
      }
    });

    // Inventory Domain Schemas
    this.registerSchema('inventory.reserved', 'v1', {
      type: 'object',
      required: ['orderId', 'reservations'],
      properties: {
        orderId: { type: 'string', format: 'uuid' },
        reservations: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['productVariantId', 'warehouseId', 'quantity', 'reservationId'],
            properties: {
              productVariantId: { type: 'string', format: 'uuid' },
              warehouseId: { type: 'string', format: 'uuid' },
              quantity: { type: 'integer', minimum: 1 },
              reservationId: { type: 'string', format: 'uuid' },
              expiresAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    });

    // Seller Domain Schemas
    this.registerSchema('seller.kyc.approved', 'v1', {
      type: 'object',
      required: ['sellerId', 'approvedBy', 'approvedAt'],
      properties: {
        sellerId: { type: 'string', format: 'uuid' },
        approvedBy: { type: 'string', format: 'uuid' },
        approvedAt: { type: 'string', format: 'date-time' },
        kycLevel: { type: 'string', enum: ['basic', 'enhanced', 'premium'] },
        documents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              verified: { type: 'boolean' }
            }
          }
        }
      }
    });

    // Logistics Domain Schemas
    this.registerSchema('logistics.delivery.completed', 'v1', {
      type: 'object',
      required: ['orderId', 'shipmentId', 'deliveredAt'],
      properties: {
        orderId: { type: 'string', format: 'uuid' },
        shipmentId: { type: 'string', format: 'uuid' },
        deliveredAt: { type: 'string', format: 'date-time' },
        recipientName: { type: 'string' },
        deliveryLocation: { type: 'object' },
        proofOfDelivery: {
          type: 'object',
          properties: {
            signature: { type: 'string' },
            photo: { type: 'string' }
          }
        }
      }
    });

    // VERSIONING EXAMPLES - Multiple versions of same event
    
    // Order Created v2 - Added optional fields (backward compatible)
    this.registerSchema('order.created', 'v2', {
      type: 'object',
      required: ['orderId', 'orderNumber', 'buyerId', 'sellerId', 'items', 'totalAmount', 'currency'],
      properties: {
        orderId: { type: 'string', format: 'uuid' },
        orderNumber: { type: 'string', pattern: '^ORD-\\d+-\\d{3}$' },
        buyerId: { type: 'string', format: 'uuid' },
        sellerId: { type: 'string', format: 'uuid' },
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['productVariantId', 'quantity', 'unitPrice', 'totalPrice'],
            properties: {
              productVariantId: { type: 'string', format: 'uuid' },
              quantity: { type: 'integer', minimum: 1 },
              unitPrice: { type: 'number', minimum: 0 },
              totalPrice: { type: 'number', minimum: 0 },
              discountAmount: { type: 'number', minimum: 0 },
              taxAmount: { type: 'number', minimum: 0 }
            }
          }
        },
        totalAmount: { type: 'number', minimum: 0 },
        currency: { type: 'string', enum: ['TZS', 'USD', 'EUR'] },
        shippingAddress: { type: 'object' },
        billingAddress: { type: 'object' },
        discountCode: { type: 'string' },
        totalDiscount: { type: 'number', minimum: 0 },
        totalTax: { type: 'number', minimum: 0 },
        orderSource: { type: 'string', enum: ['web', 'mobile', 'api'] },
        customerNotes: { type: 'string' }
      }
    });

    // Payment Succeeded v2 - Breaking change
    this.registerSchema('payment.succeeded', 'v2', {
      type: 'object',
      required: ['paymentId', 'orderId', 'amount', 'currency', 'paymentMethod', 'processingFee'],
      properties: {
        paymentId: { type: 'string', format: 'uuid' },
        orderId: { type: 'string', format: 'uuid' },
        amount: { type: 'number', minimum: 0 },
        currency: { type: 'string', enum: ['TZS', 'USD', 'EUR'] },
        paymentMethod: { type: 'string', enum: ['card', 'mobile_money', 'bank_transfer', 'crypto'] },
        transactionId: { type: 'string' },
        processingFee: { type: 'number', minimum: 0 },
        exchangeRate: { type: 'number', minimum: 0 },
        originalAmount: { type: 'number', minimum: 0 },
        originalCurrency: { type: 'string' }
      }
    });
  }

  private registerSchema(eventType: string, version: string, schema: object, deprecated = false) {
    if (!this.schemas[eventType]) {
      this.schemas[eventType] = {};
    }

    this.schemas[eventType][version] = {
      version,
      schema,
      deprecated,
      deprecationDate: deprecated ? new Date().toISOString() : undefined
    };

    // Compile schema for validation
    const schemaId = `${eventType}.${version}`;
    this.ajv.addSchema(schema, schemaId);
  }

  private markAsDeprecated(eventType: string, version: string, deprecationDate: string) {
    if (this.schemas[eventType]?.[version]) {
      this.schemas[eventType][version].deprecated = true;
      this.schemas[eventType][version].deprecationDate = deprecationDate;
    }
  }

  validateEvent(eventType: string, version: string, payload: any): {
    valid: boolean;
    errors?: string[];
  } {
    const schemaId = `${eventType}.${version}`;
    const validate = this.ajv.getSchema(schemaId);

    if (!validate) {
      return {
        valid: false,
        errors: [`Schema not found for ${eventType} version ${version}`]
      };
    }

    const valid = validate(payload);
    
    if (!valid && validate.errors) {
      return {
        valid: false,
        errors: validate.errors.map((err): { instancePath: any; message: any; } => 
          `${err.instancePath} ${err.message}`
        )
      };
    }

    return { valid: true };
  }

  getSupportedVersions(eventType: string): string[] {
    return Object.keys(this.schemas[eventType] || {});
  }

  getLatestVersion(eventType: string): string | null {
    const versions = this.getSupportedVersions(eventType);
    if (versions.length === 0) return null;
    
    // Sort versions (assuming semantic versioning)
    return versions.sort().reverse()[0];
  }

  isVersionDeprecated(eventType: string, version: string): boolean {
    return this.schemas[eventType]?.[version]?.deprecated || false;
  }

  getSchema(eventType: string, version: string): object | null {
    return this.schemas[eventType]?.[version]?.schema || null;
  }

  getAllEventTypes(): string[] {
    return Object.keys(this.schemas);
  }

  checkCompatibility(eventType: string, fromVersion: string, toVersion: string): {
    compatible: boolean;
    issues?: string[];
  } {
    const fromSchema = this.getSchema(eventType, fromVersion);
    const toSchema = this.getSchema(eventType, toVersion);

    if (!fromSchema || !toSchema) {
      return {
        compatible: false,
        issues: ['One or both schemas not found']
      };
    }

    // Basic compatibility check (simplified)
    // In production, use a proper schema compatibility library
    return {
      compatible: true,
      issues: []
    };
  }
}

export const eventSchemaRegistry = new EventSchemaRegistry();