// Event Schema Validation and Versioning
// Implements event schema validation and evolution patterns

import { EventPayload } from '../../shared-contracts/events'

export interface EventSchema {
  event: string
  version: string
  schema: any // JSON Schema or similar
  breaking: boolean // Whether this version breaks backward compatibility
  migration?: (oldPayload: any) => EventPayload // Migration function for old versions
}

export interface EventVersion {
  event: string
  currentVersion: string
  supportedVersions: string[]
  schemas: Map<string, EventSchema>
}

export class EventSchemaValidator {
  private eventVersions: Map<string, EventVersion> = new Map()

  constructor() {
    this.initializeEventSchemas()
  }

  // Register an event schema
  registerSchema(schema: EventSchema): void {
    const eventKey = schema.event

    if (!this.eventVersions.has(eventKey)) {
      this.eventVersions.set(eventKey, {
        event: eventKey,
        currentVersion: schema.version,
        supportedVersions: [],
        schemas: new Map()
      })
    }

    const eventVersion = this.eventVersions.get(eventKey)!
    eventVersion.schemas.set(schema.version, schema)
    eventVersion.supportedVersions.push(schema.version)

    // Update current version if this is newer
    if (this.isNewerVersion(schema.version, eventVersion.currentVersion)) {
      eventVersion.currentVersion = schema.version
    }
  }

  // Validate event payload against schema
  validateEvent(eventType: string, version: string, payload: any): { valid: boolean; errors?: string[] } {
    const eventVersion = this.eventVersions.get(eventType)
    if (!eventVersion) {
      return { valid: false, errors: [`Unknown event type: ${eventType}`] }
    }

    const schema = eventVersion.schemas.get(version)
    if (!schema) {
      return { valid: false, errors: [`Unsupported version ${version} for event ${eventType}`] }
    }

    // Basic validation - in production, use a proper JSON Schema validator
    const errors = this.validatePayloadAgainstSchema(payload, schema.schema, eventVersion)
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  // Migrate event payload to latest version
  migrateEvent(eventType: string, fromVersion: string, payload: any): { migrated: boolean; payload: EventPayload; targetVersion: string } {
    const eventVersion = this.eventVersions.get(eventType)
    if (!eventVersion) {
      throw new Error(`Unknown event type: ${eventType}`)
    }

    if (fromVersion === eventVersion.currentVersion) {
      return { migrated: false, payload, targetVersion: fromVersion }
    }

    let currentPayload = payload
    let currentVersion = fromVersion

    // Apply migrations sequentially
    while (currentVersion !== eventVersion.currentVersion) {
      const schema = eventVersion.schemas.get(currentVersion)
      if (!schema?.migration) {
        throw new Error(`No migration path from version ${currentVersion} to ${eventVersion.currentVersion}`)
      }

      currentPayload = schema.migration(currentPayload)
      currentVersion = this.getNextVersion(currentVersion, eventVersion)
    }

    return {
      migrated: true,
      payload: currentPayload,
      targetVersion: eventVersion.currentVersion
    }
  }

  // Get supported versions for an event
  getSupportedVersions(eventType: string): string[] {
    const eventVersion = this.eventVersions.get(eventType)
    return eventVersion?.supportedVersions || []
  }

  // Check if a version is supported
  isVersionSupported(eventType: string, version: string): boolean {
    const eventVersion = this.eventVersions.get(eventType)
    return eventVersion?.supportedVersions.includes(version) || false
  }

  private initializeEventSchemas(): void {
    // UserRegistered Event Schemas
    this.registerSchema({
      event: 'UserRegistered',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['userId', 'email', 'role'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['buyer', 'seller', 'admin'] }
        }
      },
      breaking: false
    })

    // UserSuspended Event Schemas
    this.registerSchema({
      event: 'UserSuspended',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['userId', 'reason'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          reason: { type: 'string' },
          suspendedBy: { type: 'string', format: 'uuid' },
          suspensionDuration: { type: 'number' }
        }
      },
      breaking: false
    })

    // OrderCreated Event Schemas
    this.registerSchema({
      event: 'OrderCreated',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['orderId', 'buyerId', 'items', 'totalAmount'],
        properties: {
          orderId: { type: 'string', format: 'uuid' },
          buyerId: { type: 'string', format: 'uuid' },
          sellerId: { type: 'string', format: 'uuid' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'quantity', 'price'],
              properties: {
                productId: { type: 'string', format: 'uuid' },
                quantity: { type: 'number', minimum: 1 },
                price: {
                  type: 'object',
                  required: ['amount', 'currency'],
                  properties: {
                    amount: { type: 'number', minimum: 0 },
                    currency: { type: 'string', minLength: 3, maxLength: 3 }
                  }
                }
              }
            }
          },
          totalAmount: {
            type: 'object',
            required: ['amount', 'currency'],
            properties: {
              amount: { type: 'number', minimum: 0 },
              currency: { type: 'string', minLength: 3, maxLength: 3 }
            }
          }
        }
      },
      breaking: false
    })

    // OrderPaid Event Schemas
    this.registerSchema({
      event: 'OrderPaid',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['orderId', 'buyerId', 'amount', 'paymentId'],
        properties: {
          orderId: { type: 'string', format: 'uuid' },
          buyerId: { type: 'string', format: 'uuid' },
          amount: {
            type: 'object',
            required: ['amount', 'currency'],
            properties: {
              amount: { type: 'number', minimum: 0 },
              currency: { type: 'string', minLength: 3, maxLength: 3 }
            }
          },
          paymentId: { type: 'string', format: 'uuid' }
        }
      },
      breaking: false
    })

    // PaymentSucceeded Event Schemas
    this.registerSchema({
      event: 'PaymentSucceeded',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['paymentId', 'orderId', 'amount'],
        properties: {
          paymentId: { type: 'string', format: 'uuid' },
          orderId: { type: 'string', format: 'uuid' },
          amount: {
            type: 'object',
            required: ['amount', 'currency'],
            properties: {
              amount: { type: 'number', minimum: 0 },
              currency: { type: 'string', minLength: 3, maxLength: 3 }
            }
          },
          transactionId: { type: 'string' },
          paymentMethod: { type: 'string' }
        }
      },
      breaking: false
    })

    // AdminOverrideApplied Event Schemas
    this.registerSchema({
      event: 'AdminOverrideApplied',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['adminId', 'action', 'entityType', 'entityId', 'reason'],
        properties: {
          adminId: { type: 'string', format: 'uuid' },
          action: { type: 'string' },
          entityType: { type: 'string' },
          entityId: { type: 'string', format: 'uuid' },
          reason: { type: 'string' },
          previousState: { type: 'object' },
          newState: { type: 'object' },
          approvedBy: { type: 'array', items: { type: 'string', format: 'uuid' } }
        }
      },
      breaking: false
    })

    // DisputeOpened Event Schemas
    this.registerSchema({
      event: 'DisputeOpened',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['disputeId', 'orderId', 'buyerId', 'sellerId', 'reason'],
        properties: {
          disputeId: { type: 'string', format: 'uuid' },
          orderId: { type: 'string', format: 'uuid' },
          buyerId: { type: 'string', format: 'uuid' },
          sellerId: { type: 'string', format: 'uuid' },
          reason: { type: 'string' },
          description: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } }
        }
      },
      breaking: false
    })

    // SellerVerified Event Schemas
    this.registerSchema({
      event: 'SellerVerified',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['sellerId', 'kycStatus'],
        properties: {
          sellerId: { type: 'string', format: 'uuid' },
          kycStatus: { type: 'string', enum: ['verified', 'pending', 'rejected'] },
          verifiedAt: { type: 'string', format: 'date-time' },
          verifiedBy: { type: 'string', format: 'uuid' }
        }
      },
      breaking: false
    })

    // ProductPublished Event Schemas
    this.registerSchema({
      event: 'ProductPublished',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['productId', 'sellerId', 'name', 'price'],
        properties: {
          productId: { type: 'string', format: 'uuid' },
          sellerId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          price: {
            type: 'object',
            required: ['amount', 'currency'],
            properties: {
              amount: { type: 'number', minimum: 0 },
              currency: { type: 'string', minLength: 3, maxLength: 3 }
            }
          },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      },
      breaking: false
    })

    // OrderShipped Event Schemas
    this.registerSchema({
      event: 'OrderShipped',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['orderId', 'logisticsId'],
        properties: {
          orderId: { type: 'string', format: 'uuid' },
          logisticsId: { type: 'string', format: 'uuid' },
          trackingNumber: { type: 'string' },
          carrier: { type: 'string' },
          estimatedDelivery: { type: 'string', format: 'date-time' }
        }
      },
      breaking: false
    })

    // OrderDelivered Event Schemas
    this.registerSchema({
      event: 'OrderDelivered',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['orderId', 'deliveredAt'],
        properties: {
          orderId: { type: 'string', format: 'uuid' },
          deliveredAt: { type: 'string', format: 'date-time' },
          logisticsId: { type: 'string', format: 'uuid' },
          trackingNumber: { type: 'string' }
        }
      },
      breaking: false
    })

    // RefundCompleted Event Schemas
    this.registerSchema({
      event: 'RefundCompleted',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['paymentId', 'orderId', 'amount', 'reason'],
        properties: {
          paymentId: { type: 'string', format: 'uuid' },
          orderId: { type: 'string', format: 'uuid' },
          amount: {
            type: 'object',
            required: ['amount', 'currency'],
            properties: {
              amount: { type: 'number', minimum: 0 },
              currency: { type: 'string', minLength: 3, maxLength: 3 }
            }
          },
          reason: { type: 'string' },
          refundId: { type: 'string', format: 'uuid' },
          processedAt: { type: 'string', format: 'date-time' }
        }
      },
      breaking: false
    })

    // CommissionEarned Event Schemas
    this.registerSchema({
      event: 'CommissionEarned',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['commissionId', 'orderId', 'amount', 'recipientId', 'recipientType'],
        properties: {
          commissionId: { type: 'string', format: 'uuid' },
          orderId: { type: 'string', format: 'uuid' },
          amount: {
            type: 'object',
            required: ['amount', 'currency'],
            properties: {
              amount: { type: 'number', minimum: 0 },
              currency: { type: 'string', minLength: 3, maxLength: 3 }
            }
          },
          recipientId: { type: 'string', format: 'uuid' },
          recipientType: { type: 'string', enum: ['seller', 'enabler'] },
          percentage: { type: 'number', minimum: 0, maximum: 100 },
          earnedAt: { type: 'string', format: 'date-time' }
        }
      },
      breaking: false
    })

    // DisputeResolved Event Schemas
    this.registerSchema({
      event: 'DisputeResolved',
      version: 'v1',
      schema: {
        type: 'object',
        required: ['disputeId', 'orderId', 'resolution'],
        properties: {
          disputeId: { type: 'string', format: 'uuid' },
          orderId: { type: 'string', format: 'uuid' },
          resolution: { type: 'string', enum: ['refund', 'uphold', 'split'] },
          amount: {
            type: 'object',
            required: ['amount', 'currency'],
            properties: {
              amount: { type: 'number', minimum: 0 },
              currency: { type: 'string', minLength: 3, maxLength: 3 }
            }
          },
          resolvedAt: { type: 'string', format: 'date-time' },
          resolvedBy: { type: 'string', format: 'uuid' },
          notes: { type: 'string' }
        }
      },
      breaking: false
    })
  }

  private validatePayloadAgainstSchema(payload: any, schema: any, eventVersion: EventVersion): string[] {
    const errors: string[] = []

    // Basic validation - in production, use a proper JSON Schema validator like ajv
    if (schema.type === 'object' && schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in payload)) {
          errors.push(`Missing required field: ${requiredField}`)
        }
      }
    }

    // Validate version field if present in payload
    if ('version' in payload && typeof payload.version === 'string') {
      const expectedVersion = `${eventVersion.currentVersion}`
      if (payload.version !== expectedVersion) {
        errors.push(`Version mismatch: expected ${expectedVersion}, got ${payload.version}`)
      }
    }

    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in payload) {
          const fieldErrors = this.validateField(payload[field], fieldSchema as any)
          errors.push(...fieldErrors.map(error => `${field}: ${error}`))
        }
      }
    }

    return errors
  }

  private validateField(value: any, schema: any): string[] {
    const errors: string[] = []

    // Type validation
    if (schema.type && typeof value !== schema.type) {
      errors.push(`Expected type ${schema.type}, got ${typeof value}`)
    }

    // Format validation
    if (schema.format === 'uuid' && !this.isValidUUID(value)) {
      errors.push('Invalid UUID format')
    }

    if (schema.format === 'email' && !this.isValidEmail(value)) {
      errors.push('Invalid email format')
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Value must be one of: ${schema.enum.join(', ')}`)
    }

    // Number validation
    if (schema.type === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`Value must be >= ${schema.minimum}`)
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`Value must be <= ${schema.maximum}`)
      }
    }

    // String validation
    if (schema.type === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`String must be >= ${schema.minLength} characters`)
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(`String must be <= ${schema.maxLength} characters`)
      }
    }

    // Array validation
    if (schema.type === 'array' && schema.items && Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const itemErrors = this.validateField(value[i], schema.items)
        errors.push(...itemErrors.map(error => `[${i}]: ${error}`))
      }
    }

    return errors
  }

  private isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  }

  private isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  private isNewerVersion(version1: string, version2: string): boolean {
    // Simple version comparison - in production, use proper semver
    const v1 = parseInt(version1.replace('v', ''))
    const v2 = parseInt(version2.replace('v', ''))
    return v1 > v2
  }

  private getNextVersion(currentVersion: string, eventVersion: EventVersion): string {
    // Find the next version in sequence
    const currentIndex = eventVersion.supportedVersions.indexOf(currentVersion)
    if (currentIndex === -1 || currentIndex === eventVersion.supportedVersions.length - 1) {
      return eventVersion.currentVersion
    }
    return eventVersion.supportedVersions[currentIndex + 1]
  }

  // Health check
  healthCheck(): any {
    return {
      status: 'healthy',
      service: 'event-schema-validator',
      registeredEvents: Array.from(this.eventVersions.keys()).length,
      totalSchemas: Array.from(this.eventVersions.values()).reduce((sum, ev) => sum + ev.schemas.size, 0)
    }
  }
}

// Singleton instance
export const eventSchemaValidator = new EventSchemaValidator()
