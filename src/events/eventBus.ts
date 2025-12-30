import { EventEnvelope } from '../../shared-contracts/types'
import { EventPayload } from '../../shared-contracts/events'
import Redis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
import { eventSchemaValidator } from './eventSchemas'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Event processing interfaces
export interface EventConsumer {
  name: string
  handler: (envelope: EventEnvelope) => Promise<void>
  idempotencyKey?: (envelope: EventEnvelope) => string
}

export interface DeadLetterQueueEntry {
  eventId: string
  eventType: string
  consumerName: string
  error: string
  retryCount: number
  lastAttemptedAt: Date
  nextRetryAt?: Date
  envelope: EventEnvelope
}

export class EnhancedEventBus {
  private consumers: Map<string, EventConsumer[]> = new Map()
  private redis: Redis
  private dlq: DeadLetterQueueEntry[] = []
  private processingTimeouts: Map<string, NodeJS.Timeout> = new Map()

  // Circuit Breaker State
  private circuitBreakerState: Map<string, {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    failureCount: number
    lastFailureTime: number
    nextAttemptTime: number
  }> = new Map()

  // Configuration
  private readonly MAX_RETRY_ATTEMPTS = 5
  private readonly BASE_RETRY_DELAY_MS = 1000 // 1 second
  private readonly IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60 // 24 hours
  private readonly PROCESSING_TIMEOUT_MS = 30000 // 30 seconds

  // Circuit Breaker Configuration
  private readonly CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5 // failures before opening
  private readonly CIRCUIT_BREAKER_TIMEOUT_MS = 60000 // 1 minute before attempting half-open
  private readonly CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 3 // successes needed to close circuit

  constructor(redisUrl?: string) {
    // Initialize Redis for idempotency and caching
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379')

    // Clean up expired processing timeouts periodically
    setInterval(() => this.cleanupExpiredTimeouts(), 60000) // Every minute
  }

  // Subscribe to events with consumer name for idempotency
  subscribe(eventPattern: string, consumer: EventConsumer): void {
    if (!this.consumers.has(eventPattern)) {
      this.consumers.set(eventPattern, [])
    }
    this.consumers.get(eventPattern)!.push(consumer)
  }

  // Publish event with enhanced error handling and DLQ
  async publish(envelope: EventEnvelope): Promise<void> {
    const eventKey = `${envelope.event}.v${envelope.version}`

    // Validate event envelope
    this.validateEventEnvelope(envelope)

    // Validate event payload against schema
    const schemaValidation = eventSchemaValidator.validateEvent(envelope.event, envelope.version, envelope.payload)
    if (!schemaValidation.valid) {
      throw new Error(`Event schema validation failed: ${schemaValidation.errors?.join(', ')}`)
    }

    // Get matching consumers
    const matchingConsumers = this.getMatchingConsumers(eventKey)

    // Process event for each consumer
    const processingPromises = matchingConsumers.map(consumer =>
      this.processEventForConsumer(envelope, consumer)
    )

    // Wait for all consumers to process (or fail gracefully)
    await Promise.allSettled(processingPromises)
  }

  // Idempotent event processing with retry logic - Optimized with atomic operations
  private async processEventForConsumer(envelope: EventEnvelope, consumer: EventConsumer, isReplay = false): Promise<void> {
    const consumerKey = consumer.name

    // Circuit Breaker Check
    if (!this.checkCircuitBreaker(consumerKey)) {
      console.warn(`Circuit breaker OPEN for consumer ${consumerKey}, skipping event ${envelope.eventId}`)
      return
    }

    const idempotencyKey = consumer.idempotencyKey
      ? consumer.idempotencyKey(envelope)
      : `${consumer.name}:${envelope.eventId}`

    // Use Redis atomic operation to check and set processing flag
    const processingKey = `event:processing:${idempotencyKey}`
    const processedKey = `event:processed:${idempotencyKey}`

    // Atomic check-and-set using Redis pipeline for better performance
    const pipeline = this.redis.pipeline()
    pipeline.get(processedKey)  // Check if already processed
    pipeline.set(processingKey, '1', 'EX', this.PROCESSING_TIMEOUT_MS / 1000, 'NX')  // Set processing flag only if not exists

    const results = await pipeline.exec()
    const [processedResult, processingResult] = results || []

    // If already processed, return immediately
    if (processedResult[1]) {
      console.log(`Event ${envelope.eventId} already processed by ${consumer.name}`)
      return
    }

    // If couldn't acquire processing lock, another instance is processing
    if (!processingResult[1]) {
      console.log(`Event ${envelope.eventId} is being processed by another instance`)
      return
    }

    const startTime = Date.now()
    let processingDuration: number | undefined

    try {
      // Process the event with timeout
      await this.executeWithTimeout(
        consumer.handler(envelope),
        this.PROCESSING_TIMEOUT_MS,
        `Event processing timeout for ${consumer.name}`
      )

      processingDuration = Date.now() - startTime

      // Circuit Breaker: Record success
      this.recordCircuitBreakerSuccess(consumerKey)

      // Atomic mark as processed and store record for critical flows
      const isCriticalFlow = this.isCriticalFlowEvent(envelope.event)
      const flowType = this.getFlowType(envelope.event)

      // Use pipeline for atomic operations
      const finalPipeline = this.redis.pipeline()
      finalPipeline.setex(processedKey, this.IDEMPOTENCY_TTL_SECONDS, '1')
      finalPipeline.del(processingKey)

      // Store permanent record asynchronously for critical flows only
      if (isCriticalFlow || flowType) {
        // Fire-and-forget for better performance - don't await
        this.storeProcessedEventRecordAsync(envelope, consumer, idempotencyKey, processingDuration, isCriticalFlow, flowType)
      }

      await finalPipeline.exec()

      console.log(`Event ${envelope.eventId} successfully processed by ${consumer.name}`)

      // Emit EventReplayed event if this was a replay
      if (isReplay) {
        this.emitEventReplayed(envelope, consumer)
      }

    } catch (error) {
      console.error(`Event processing failed for ${consumer.name}:`, error)

      // Circuit Breaker: Record failure
      this.recordCircuitBreakerFailure(consumerKey)

      // Clean up processing flag
      await this.redis.del(processingKey)

      // Handle failure with retry/DLQ logic
      await this.handleProcessingFailure(envelope, consumer, error as Error)
    }
  }

  // Store permanent record for critical flows - synchronous version
  private async storeProcessedEventRecord(
    envelope: EventEnvelope,
    consumer: EventConsumer,
    idempotencyKey: string,
    processingDuration?: number
  ): Promise<void> {
    // Determine if this is a critical flow
    const isCriticalFlow = this.isCriticalFlowEvent(envelope.event)
    const flowType = this.getFlowType(envelope.event)

    if (!isCriticalFlow && !flowType) {
      // Not a critical flow, skip permanent storage
      return
    }

    try {
      // Extract business entity references
      const businessRefs = this.extractBusinessReferences(envelope)

      await prisma.processedEvent.create({
        data: {
          eventId: envelope.eventId,
          eventType: envelope.event,
          consumerName: consumer.name,
          idempotencyKey,
          eventVersion: envelope.version,
          eventPayload: envelope.payload as any,
          producer: envelope.producer,
          processingDuration,
          isCriticalFlow,
          flowType,
          ...businessRefs
        }
      })
    } catch (error) {
      // Log error but don't fail the event processing
      console.warn(`Failed to store processed event record:`, error)
    }
  }

  // Async fire-and-forget version for better performance
  private storeProcessedEventRecordAsync(
    envelope: EventEnvelope,
    consumer: EventConsumer,
    idempotencyKey: string,
    processingDuration: number | undefined,
    isCriticalFlow: boolean,
    flowType: string | null
  ): void {
    // Fire and forget - don't await
    setImmediate(async () => {
      try {
        const businessRefs = this.extractBusinessReferences(envelope)

        await prisma.processedEvent.create({
          data: {
            eventId: envelope.eventId,
            eventType: envelope.event,
            consumerName: consumer.name,
            idempotencyKey,
            eventVersion: envelope.version,
            eventPayload: envelope.payload as any,
            producer: envelope.producer,
            processingDuration,
            isCriticalFlow,
            flowType,
            ...businessRefs
          }
        })
      } catch (error) {
        // Log error but don't fail the event processing
        console.warn(`Failed to store processed event record asynchronously:`, error)
      }
    })
  }

  // Check if event is for a critical flow
  private isCriticalFlowEvent(eventType: string): boolean {
    const criticalEvents = [
      'OrderPaid',
      'OrderCreated',
      'PaymentSucceeded',
      'PaymentFailed',
      'RefundCompleted',
      'CommissionEarned',
      'UserRegistered',
      'SellerVerified'
    ]
    return criticalEvents.includes(eventType)
  }

  // Get flow type for categorization
  private getFlowType(eventType: string): string | null {
    const flowMappings: Record<string, string> = {
      'OrderPaid': 'payment',
      'OrderCreated': 'order',
      'OrderShipped': 'logistics',
      'OrderDelivered': 'logistics',
      'PaymentSucceeded': 'payment',
      'PaymentFailed': 'payment',
      'RefundCompleted': 'payment',
      'CommissionEarned': 'commission',
      'UserRegistered': 'auth',
      'UserSuspended': 'auth',
      'SellerVerified': 'seller',
      'ProductPublished': 'catalog',
      'InventoryReserved': 'inventory'
    }
    return flowMappings[eventType] || null
  }

  // Extract business entity references from event payload
  private extractBusinessReferences(envelope: EventEnvelope): {
    orderId?: string
    paymentId?: string
    userId?: string
  } {
    const payload = envelope.payload as any

    return {
      orderId: payload.orderId,
      paymentId: payload.paymentId,
      userId: payload.userId || payload.buyerId || payload.sellerId
    }
  }

  // Execute handler with timeout
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(timeoutMessage))
      }, timeoutMs)

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout))
    })
  }

  // Handle processing failures with exponential backoff and DLQ
  private async handleProcessingFailure(
    envelope: EventEnvelope,
    consumer: EventConsumer,
    error: Error
  ): Promise<void> {
    const dlqKey = `dlq:${consumer.name}:${envelope.eventId}`
    const existingEntry = await this.redis.get(dlqKey)

    let retryCount = 0
    let nextRetryAt: Date | undefined

    if (existingEntry) {
      const parsed = JSON.parse(existingEntry) as DeadLetterQueueEntry
      retryCount = parsed.retryCount + 1
    }

    if (retryCount < this.MAX_RETRY_ATTEMPTS) {
      // Calculate exponential backoff delay
      const delayMs = this.BASE_RETRY_DELAY_MS * Math.pow(2, retryCount)
      nextRetryAt = new Date(Date.now() + delayMs)

      // Schedule retry
      const timeoutId = setTimeout(async () => {
        try {
          await this.processEventForConsumer(envelope, consumer)
        } catch (retryError) {
          console.error(`Retry failed for ${consumer.name}:`, retryError)
        } finally {
          this.processingTimeouts.delete(dlqKey)
        }
      }, delayMs)

      this.processingTimeouts.set(dlqKey, timeoutId)

      console.log(`Scheduled retry ${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS} for ${consumer.name} in ${delayMs}ms`)
    } else {
      // Move to DLQ
      const dlqEntry: DeadLetterQueueEntry = {
        eventId: envelope.eventId,
        eventType: envelope.event,
        consumerName: consumer.name,
        error: error.message,
        retryCount,
        lastAttemptedAt: new Date(),
        envelope
      }

      this.dlq.push(dlqEntry)

      // Store in Redis for persistence
      await this.redis.setex(dlqKey, 7 * 24 * 60 * 60, JSON.stringify(dlqEntry)) // 7 days

      console.error(`Event ${envelope.eventId} moved to DLQ for consumer ${consumer.name}`)
    }
  }

  // Get matching consumers for an event
  private getMatchingConsumers(eventKey: string): EventConsumer[] {
    const matchingConsumers: EventConsumer[] = []

    for (const [pattern, consumers] of this.consumers) {
      if (this.matchesPattern(eventKey, pattern)) {
        matchingConsumers.push(...consumers)
      }
    }

    return matchingConsumers
  }

  // Simple pattern matching (supports wildcards)
  private matchesPattern(eventKey: string, pattern: string): boolean {
    if (pattern === '*') return true
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return regex.test(eventKey)
    }
    return eventKey === pattern
  }

  // Validate event envelope structure
  private validateEventEnvelope(envelope: EventEnvelope): void {
    if (!envelope.event || !envelope.version || !envelope.eventId || !envelope.producer || !envelope.timestamp) {
      throw new Error('Invalid event envelope: missing required fields')
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(envelope.eventId)) {
      throw new Error('Invalid event ID: must be a valid UUID')
    }

    // Validate timestamp
    const timestamp = new Date(envelope.timestamp)
    if (isNaN(timestamp.getTime())) {
      throw new Error('Invalid timestamp format')
    }
  }

  // DLQ management
  getDeadLetterQueue(): DeadLetterQueueEntry[] {
    return [...this.dlq]
  }

  async clearDeadLetterQueueEntry(eventId: string, consumerName: string): Promise<void> {
    this.dlq = this.dlq.filter(entry =>
      !(entry.eventId === eventId && entry.consumerName === consumerName)
    )

    const dlqKey = `dlq:${consumerName}:${eventId}`
    await this.redis.del(dlqKey)
  }

  async replayDeadLetterQueueEntry(eventId: string, consumerName: string): Promise<void> {
    const entry = this.dlq.find(e => e.eventId === eventId && e.consumerName === consumerName)
    if (!entry) {
      throw new Error('DLQ entry not found')
    }

    const consumer = this.findConsumerByName(consumerName)
    if (!consumer) {
      throw new Error('Consumer not found')
    }

    // Clear from DLQ
    await this.clearDeadLetterQueueEntry(eventId, consumerName)

    // Replay the event (pass isReplay=true to emit EventReplayed event)
    await this.processEventForConsumer(entry.envelope, consumer, true)
  }

  // Circuit Breaker Methods
  private checkCircuitBreaker(consumerKey: string): boolean {
    const state = this.circuitBreakerState.get(consumerKey)

    if (!state) {
      // First time, circuit is closed
      return true
    }

    const now = Date.now()

    switch (state.state) {
      case 'CLOSED':
        return true

      case 'OPEN':
        if (now >= state.nextAttemptTime) {
          // Time to try half-open
          state.state = 'HALF_OPEN'
          state.failureCount = 0
          console.log(`Circuit breaker HALF_OPEN for consumer ${consumerKey}`)
          return true
        }
        return false

      case 'HALF_OPEN':
        return true

      default:
        return true
    }
  }

  private recordCircuitBreakerSuccess(consumerKey: string): void {
    const state = this.circuitBreakerState.get(consumerKey)

    if (!state) {
      // Initialize with success
      this.circuitBreakerState.set(consumerKey, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0
      })
      return
    }

    if (state.state === 'HALF_OPEN') {
      // Success in half-open state - close the circuit
      state.state = 'CLOSED'
      state.failureCount = 0
      console.log(`Circuit breaker CLOSED for consumer ${consumerKey}`)
    }
  }

  private recordCircuitBreakerFailure(consumerKey: string): void {
    const state = this.circuitBreakerState.get(consumerKey) || {
      state: 'CLOSED' as const,
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    }

    state.failureCount++
    state.lastFailureTime = Date.now()

    if (state.failureCount >= this.CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      // Open the circuit
      state.state = 'OPEN'
      state.nextAttemptTime = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT_MS
      console.warn(`Circuit breaker OPEN for consumer ${consumerKey} (${state.failureCount} failures)`)
    }

    this.circuitBreakerState.set(consumerKey, state)
  }

  // EventReplayed Event Emission
  private emitEventReplayed(envelope: EventEnvelope, consumer: EventConsumer): void {
    // Create EventReplayed event
    const eventReplayedEnvelope = this.createEventEnvelope('EventReplayed', {
      originalEventId: envelope.eventId,
      originalEventType: envelope.event,
      originalEventVersion: envelope.version,
      consumerName: consumer.name,
      replayedAt: new Date().toISOString(),
      replayedBy: this.getServiceName()
    })

    // Emit the event asynchronously (fire-and-forget)
    setImmediate(async () => {
      try {
        await this.publish(eventReplayedEnvelope)
        console.log(`EventReplayed event emitted for ${envelope.eventId} by consumer ${consumer.name}`)
      } catch (error) {
        console.warn(`Failed to emit EventReplayed event:`, error)
      }
    })
  }

  // Get circuit breaker status for monitoring
  getCircuitBreakerStatus(): Record<string, any> {
    const status: Record<string, any> = {}

    for (const [consumerKey, state] of this.circuitBreakerState) {
      status[consumerKey] = {
        state: state.state,
        failureCount: state.failureCount,
        lastFailureTime: new Date(state.lastFailureTime).toISOString(),
        nextAttemptTime: state.nextAttemptTime ? new Date(state.nextAttemptTime).toISOString() : null
      }
    }

    return status
  }

  private findConsumerByName(name: string): EventConsumer | undefined {
    for (const consumers of this.consumers.values()) {
      const consumer = consumers.find(c => c.name === name)
      if (consumer) return consumer
    }
    return undefined
  }

  // Cleanup utilities
  private cleanupExpiredTimeouts(): void {
    // This is a basic implementation - in production, you'd want more sophisticated cleanup
    for (const [key, timeout] of this.processingTimeouts) {
      // Clear any long-running timeouts (basic safeguard)
      clearTimeout(timeout)
      this.processingTimeouts.delete(key)
    }
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      await this.redis.ping()

      return {
        status: 'healthy',
        service: 'event-bus',
        redis: 'connected',
        activeConsumers: Array.from(this.consumers.keys()).length,
        dlqSize: this.dlq.length,
        processingTimeouts: this.processingTimeouts.size
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'event-bus',
        error: (error as Error).message
      }
    }
  }

  // Helper function to create event envelopes with automatic UUID generation and producer identification
  createEventEnvelope<T extends EventPayload>(
    eventName: string,
    payload: Omit<T, 'version'>,
    producer?: string
  ): EventEnvelope<T> {
    // Get current version from schema validator
    const currentVersion = eventSchemaValidator.getSupportedVersions(eventName)[0] || 'v1'

    // Generate UUID for eventId
    const eventId = uuidv4()

    // Determine producer - use service name or provided value
    const producerName = producer || this.getServiceName()

    // Create payload with version
    const payloadWithVersion = {
      ...payload,
      version: currentVersion
    } as T

    return {
      event: eventName,
      version: currentVersion,
      eventId,
      producer: producerName,
      timestamp: new Date().toISOString(),
      payload: payloadWithVersion
    }
  }

  // Get service name from environment or package.json
  private getServiceName(): string {
    // Try to get from environment variable
    if (process.env.SERVICE_NAME) {
      return process.env.SERVICE_NAME
    }

    // Try to extract from package.json or directory name
    try {
      const path = require('path')
      const cwd = process.cwd()
      const serviceName = path.basename(cwd).replace('-service', '').replace('maysar-', '')
      return serviceName || 'unknown-service'
    } catch {
      return 'unknown-service'
    }
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    // Clear all timeouts
    for (const timeout of this.processingTimeouts.values()) {
      clearTimeout(timeout)
    }
    this.processingTimeouts.clear()

    // Close Redis connection
    await this.redis.quit()
  }
}

// Legacy compatibility - maintain existing interface
export class EventBus {
  private enhancedBus: EnhancedEventBus

  constructor() {
    this.enhancedBus = new EnhancedEventBus()
  }

  subscribe(event: string, handler: (envelope: EventEnvelope) => void) {
    const consumer: EventConsumer = {
      name: `legacy-${event}`,
      handler: async (envelope) => handler(envelope)
    }
    this.enhancedBus.subscribe(event, consumer)
  }

  publish(envelope: EventEnvelope) {
    return this.enhancedBus.publish(envelope)
  }
}

// Export both for migration purposes
export const enhancedEventBus = new EnhancedEventBus()
export const eventBus = new EventBus()
