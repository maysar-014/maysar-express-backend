// Event Versioning System
// Implements event schema versioning (v1, v2) with backward compatibility

import { EventEnvelope } from '../../shared-contracts/types'

// Define EventPayload type locally since it's not exported
export type EventPayload = any

export type EventVersion = 'v1' | 'v2' | 'v3'
export type EventStatus = 'active' | 'deprecated' | 'retired'

export interface EventVersionInfo {
  eventType: string
  version: EventVersion
  status: EventStatus
  schema: EventSchemaDefinition
  releaseDate: string
  deprecatedDate?: string
  retiredDate?: string
  changes: string[]
  breaking: boolean
}

export interface EventSchemaDefinition {
  required: string[]
  optional: string[]
  validation: (payload: any) => boolean
  migration?: (payload: any, fromVersion: EventVersion) => any
}

export class EventVersionManager {
  private static instance: EventVersionManager
  private eventVersions: Map<string, Map<EventVersion, EventVersionInfo>> = new Map()

  private constructor() {
    this.initializeEventVersions()
  }

  static getInstance(): EventVersionManager {
    if (!EventVersionManager.instance) {
      EventVersionManager.instance = new EventVersionManager()
    }
    return EventVersionManager.instance
  }

  private initializeEventVersions(): void {
    // Initialize event versions for different event types
    this.initializeOrderEvents()
    this.initializePaymentEvents()
    this.initializeUserEvents()
  }

  private initializeOrderEvents(): void {
    const orderEvents = new Map<EventVersion, EventVersionInfo>()

    // OrderCreated v1
    orderEvents.set('v1', {
      eventType: 'OrderCreated',
      version: 'v1',
      status: 'active',
      releaseDate: '2024-01-01',
      schema: {
        required: ['orderId', 'buyerId', 'sellerId', 'totalAmount', 'currency'],
        optional: ['items', 'metadata'],
        validation: (payload) => {
          return payload.orderId && payload.buyerId && payload.sellerId &&
                 typeof payload.totalAmount === 'number'
        }
      },
      changes: ['Initial order creation event'],
      breaking: false
    })

    // OrderCreated v2
    orderEvents.set('v2', {
      eventType: 'OrderCreated',
      version: 'v2',
      status: 'active',
      releaseDate: '2024-06-01',
      schema: {
        required: ['orderId', 'buyerId', 'sellerId', 'totalAmount', 'currency', 'items'],
        optional: ['metadata', 'shippingAddress', 'billingAddress'],
        validation: (payload) => {
          return payload.orderId && payload.buyerId && payload.sellerId &&
                 Array.isArray(payload.items) && payload.items.length > 0
        },
        migration: (payload, fromVersion) => {
          if (fromVersion === 'v1') {
            // Migrate from v1 to v2
            return {
              ...payload,
              items: payload.items || [],
              shippingAddress: payload.shippingAddress || null,
              billingAddress: payload.billingAddress || null
            }
          }
          return payload
        }
      },
      changes: ['Added required items array', 'Added shipping/billing addresses'],
      breaking: true
    })

    this.eventVersions.set('OrderCreated', orderEvents)
  }

  private initializePaymentEvents(): void {
    const paymentEvents = new Map<EventVersion, EventVersionInfo>()

    // PaymentSucceeded v1
    paymentEvents.set('v1', {
      eventType: 'PaymentSucceeded',
      version: 'v1',
      status: 'active',
      releaseDate: '2024-01-01',
      schema: {
        required: ['paymentId', 'orderId', 'amount', 'currency'],
        optional: ['transactionId', 'method'],
        validation: (payload) => {
          return payload.paymentId && payload.orderId && typeof payload.amount === 'number'
        }
      },
      changes: ['Initial payment success event'],
      breaking: false
    })

    this.eventVersions.set('PaymentSucceeded', paymentEvents)
  }

  private initializeUserEvents(): void {
    const userEvents = new Map<EventVersion, EventVersionInfo>()

    // UserRegistered v1
    userEvents.set('v1', {
      eventType: 'UserRegistered',
      version: 'v1',
      status: 'active',
      releaseDate: '2024-01-01',
      schema: {
        required: ['userId', 'email'],
        optional: ['firstName', 'lastName', 'phone'],
        validation: (payload) => {
          return payload.userId && payload.email && payload.email.includes('@')
        }
      },
      changes: ['Initial user registration event'],
      breaking: false
    })

    this.eventVersions.set('UserRegistered', userEvents)
  }

  // Event version management
  getEventVersionInfo(eventType: string, version: EventVersion): EventVersionInfo | undefined {
    return this.eventVersions.get(eventType)?.get(version)
  }

  getLatestEventVersion(eventType: string): EventVersionInfo | undefined {
    const eventVersions = this.eventVersions.get(eventType)
    if (!eventVersions) return undefined

    // Return the highest active version
    const activeVersions = Array.from(eventVersions.values())
      .filter(v => v.status === 'active')
      .sort((a, b) => b.version.localeCompare(a.version))

    return activeVersions[0]
  }

  getAllEventVersions(eventType: string): EventVersionInfo[] {
    return Array.from(this.eventVersions.get(eventType)?.values() || [])
  }

  getSupportedEventTypes(): string[] {
    return Array.from(this.eventVersions.keys())
  }

  // Version validation
  isValidEventVersion(eventType: string, version: string): version is EventVersion {
    return this.eventVersions.get(eventType)?.has(version as EventVersion) || false
  }

  isActiveEventVersion(eventType: string, version: EventVersion): boolean {
    const info = this.eventVersions.get(eventType)?.get(version)
    return info?.status === 'active'
  }

  // Schema validation
  validateEventPayload(eventType: string, version: EventVersion, payload: any): {
    valid: boolean
    errors: string[]
  } {
    const versionInfo = this.getEventVersionInfo(eventType, version)
    if (!versionInfo) {
      return {
        valid: false,
        errors: [`Unknown event version: ${eventType}@${version}`]
      }
    }

    const errors: string[] = []

    // Check required fields
    for (const field of versionInfo.schema.required) {
      if (!(field in payload)) {
        errors.push(`Missing required field: ${field}`)
      }
    }

    // Run custom validation
    if (!versionInfo.schema.validation(payload)) {
      errors.push('Custom validation failed')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Event migration
  migrateEventPayload(
    eventType: string,
    fromVersion: EventVersion,
    toVersion: EventVersion,
    payload: any
  ): any {
    if (fromVersion === toVersion) {
      return payload
    }

    const toVersionInfo = this.getEventVersionInfo(eventType, toVersion)
    if (!toVersionInfo?.schema.migration) {
      throw new Error(`No migration path from ${fromVersion} to ${toVersion} for ${eventType}`)
    }

    return toVersionInfo.schema.migration(payload, fromVersion)
  }

  // Backward compatibility
  canHandleEventVersion(eventType: string, consumerVersion: EventVersion, eventVersion: EventVersion): boolean {
    const consumerInfo = this.getEventVersionInfo(eventType, consumerVersion)
    const eventInfo = this.getEventVersionInfo(eventType, eventVersion)

    if (!consumerInfo || !eventInfo) {
      return false
    }

    // If consumer supports newer version, it can handle older versions
    if (consumerVersion > eventVersion) {
      return true
    }

    // If event has newer version, check if it's backward compatible
    if (eventVersion > consumerVersion) {
      return !eventInfo.breaking
    }

    return true
  }
}

// Event versioning middleware for event bus
export class EventVersioningMiddleware {
  private versionManager: EventVersionManager

  constructor() {
    this.versionManager = EventVersionManager.getInstance()
  }

  /**
   * Validate and potentially migrate event before processing
   */
  async processEvent(envelope: EventEnvelope): Promise<EventEnvelope> {
    const { event, version } = envelope

    // Validate event version
    if (!this.versionManager.isValidEventVersion(event, version)) {
      throw new Error(`Unsupported event version: ${event}@${version}`)
    }

    // Validate payload schema
    const validation = this.versionManager.validateEventPayload(event, version as EventVersion, envelope.payload)
    if (!validation.valid) {
      throw new Error(`Invalid event payload: ${validation.errors.join(', ')}`)
    }

    // Check if version is active
    if (!this.versionManager.isActiveEventVersion(event, version as EventVersion)) {
      console.warn(`Processing deprecated event version: ${event}@${version}`)
    }

    return envelope
  }

  /**
   * Get compatible event versions for a consumer
   */
  getCompatibleVersions(eventType: string, consumerVersion: EventVersion): EventVersion[] {
    const allVersions = this.versionManager.getAllEventVersions(eventType)

    return allVersions
      .filter(versionInfo =>
        this.versionManager.canHandleEventVersion(eventType, consumerVersion, versionInfo.version)
      )
      .map(v => v.version)
  }

  /**
   * Suggest event version upgrade
   */
  suggestVersionUpgrade(eventType: string, currentVersion: EventVersion): {
    shouldUpgrade: boolean
    recommendedVersion?: EventVersion
    reason?: string
  } {
    const latestVersion = this.versionManager.getLatestEventVersion(eventType)

    if (!latestVersion || latestVersion.version === currentVersion) {
      return { shouldUpgrade: false }
    }

    const currentInfo = this.versionManager.getEventVersionInfo(eventType, currentVersion)

    if (currentInfo?.status === 'deprecated') {
      return {
        shouldUpgrade: true,
        recommendedVersion: latestVersion.version,
        reason: 'Current version is deprecated'
      }
    }

    return {
      shouldUpgrade: true,
      recommendedVersion: latestVersion.version,
      reason: 'Newer version available with additional features'
    }
  }
}

// Event envelope creation with versioning
export class EventFactory {
  private versionManager: EventVersionManager

  constructor() {
    this.versionManager = EventVersionManager.getInstance()
  }

  /**
   * Create a versioned event envelope
   */
  createEvent<T extends EventPayload>(
    eventType: string,
    payload: T,
    options: {
      version?: EventVersion
      producer?: string
      metadata?: Record<string, any>
    } = {}
  ): EventEnvelope<T> {
    const version = options.version || 'v1'
    const producer = options.producer || 'unknown-service'

    // Validate event version exists
    const versionInfo = this.versionManager.getEventVersionInfo(eventType, version)
    if (!versionInfo) {
      throw new Error(`Event version not found: ${eventType}@${version}`)
    }

    // Validate payload
    const validation = this.versionManager.validateEventPayload(eventType, version, payload)
    if (!validation.valid) {
      throw new Error(`Invalid event payload: ${validation.errors.join(', ')}`)
    }

    return {
      event: eventType,
      version: version,
      eventId: this.generateEventId(),
      producer: producer,
      timestamp: new Date().toISOString(),
      payload: payload,
      metadata: options.metadata
    } as EventEnvelope<T>
  }

  /**
   * Create event with automatic version detection
   */
  createLatestEvent<T extends EventPayload>(
    eventType: string,
    payload: T,
    producer?: string
  ): EventEnvelope<T> {
    const latestVersion = this.versionManager.getLatestEventVersion(eventType)
    if (!latestVersion) {
      throw new Error(`No versions found for event type: ${eventType}`)
    }

    return this.createEvent(eventType, payload, {
      version: latestVersion.version,
      producer
    })
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Event consumer versioning support
export class VersionedEventConsumer {
  private versioningMiddleware: EventVersioningMiddleware

  constructor(
    public name: string,
    public supportedVersions: Map<string, EventVersion>,
    public handler: (envelope: EventEnvelope) => Promise<void>
  ) {
    this.versioningMiddleware = new EventVersioningMiddleware()
  }

  /**
   * Check if consumer can handle an event version
   */
  canHandleEvent(eventType: string, eventVersion: EventVersion): boolean {
    const consumerVersion = this.supportedVersions.get(eventType)
    if (!consumerVersion) return false

    return this.versioningMiddleware
      .getCompatibleVersions(eventType, consumerVersion)
      .includes(eventVersion)
  }

  /**
   * Process event with version compatibility check
   */
  async processEvent(envelope: EventEnvelope): Promise<void> {
    const { event, version } = envelope

    if (!this.canHandleEvent(event, version)) {
      throw new Error(`Consumer ${this.name} cannot handle ${event}@${version}`)
    }

    // Process the event
    await this.handler(envelope)
  }

  /**
   * Get version upgrade suggestions
   */
  getVersionUpgradeSuggestions(): Array<{
    eventType: string
    currentVersion: EventVersion
    suggestion: any
  }> {
    const suggestions: Array<{
      eventType: string
      currentVersion: EventVersion
      suggestion: any
    }> = []

    for (const [eventType, currentVersion] of this.supportedVersions) {
      const suggestion = this.versioningMiddleware.suggestVersionUpgrade(eventType, currentVersion)
      if (suggestion.shouldUpgrade) {
        suggestions.push({
          eventType,
          currentVersion,
          suggestion
        })
      }
    }

    return suggestions
  }
}

// Global instances
export const eventVersionManager = EventVersionManager.getInstance()
export const eventVersioningMiddleware = new EventVersioningMiddleware()
export const eventFactory = new EventFactory()
