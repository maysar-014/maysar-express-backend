/**
 * Message Bus Implementation
 * Infrastructure layer implementation for internal event routing
 * Provides centralized event routing with filtering, transformation, and monitoring
 */

import { DomainEvent } from '../../domain/interfaces';
import { EventSerializer, BaseEventPublisher } from './event-publisher';
import { BaseEventSubscriber, EventSubscriptionConfig, EventHandler } from './event-subscriber';

/**
 * Message Routing Rule
 */
export interface MessageRoutingRule {
  id: string;
  name: string;
  condition: (event: DomainEvent) => boolean;
  transformation?: (event: DomainEvent) => DomainEvent;
  destinations: string[]; // Channel or subscriber IDs
  priority: number;
  enabled: boolean;
  metadata?: Record<string, any>;
}

/**
 * Message Channel
 */
export interface MessageChannel {
  id: string;
  name: string;
  type: 'direct' | 'topic' | 'queue' | 'broadcast';
  subscribers: Set<string>; // Subscriber IDs
  options?: {
    durable?: boolean;
    autoDelete?: boolean;
    maxLength?: number;
    ttl?: number;
  };
}

/**
 * Message Processing Pipeline
 */
export interface MessageProcessingPipeline {
  id: string;
  name: string;
  stages: MessageProcessingStage[];
  enabled: boolean;
}

/**
 * Message Processing Stage
 */
export interface MessageProcessingStage {
  id: string;
  name: string;
  type: 'filter' | 'transform' | 'enrich' | 'validate' | 'route';
  handler: (event: DomainEvent, context: any) => Promise<DomainEvent | null>;
  options?: Record<string, any>;
}

/**
 * Message Bus Configuration
 */
export interface MessageBusConfig {
  enableRouting: boolean;
  enableFiltering: boolean;
  enableTransformation: boolean;
  enableMonitoring: boolean;
  maxConcurrency: number;
  batchSize: number;
  processingTimeout: number;
  retryAttempts: number;
  deadLetterQueue: boolean;
}

/**
 * Message Bus Metrics
 */
export interface MessageBusMetrics {
  messagesProcessed: number;
  messagesRouted: number;
  messagesFiltered: number;
  messagesTransformed: number;
  processingErrors: number;
  averageProcessingTime: number;
  channelsActive: number;
  rulesActive: number;
  timestamp: Date;
}

/**
 * Message Bus Implementation
 * Central hub for event routing and processing within the application
 */
export class MessageBus {
  private channels = new Map<string, MessageChannel>();
  private routingRules: MessageRoutingRule[] = [];
  private processingPipelines: MessageProcessingPipeline[] = [];
  private eventPublisher: BaseEventPublisher;
  private eventSubscriber: BaseEventSubscriber;
  private config: MessageBusConfig;
  private isRunning = false;

  // Metrics
  private metrics = {
    messagesProcessed: 0,
    messagesRouted: 0,
    messagesFiltered: 0,
    messagesTransformed: 0,
    processingErrors: 0,
    processingTimes: [] as number[],
    lastActivity: new Date()
  };

  constructor(
    eventPublisher: BaseEventPublisher,
    eventSubscriber: BaseEventSubscriber,
    config: Partial<MessageBusConfig> = {}
  ) {
    this.eventPublisher = eventPublisher;
    this.eventSubscriber = eventSubscriber;

    this.config = {
      enableRouting: true,
      enableFiltering: true,
      enableTransformation: true,
      enableMonitoring: true,
      maxConcurrency: 10,
      batchSize: 50,
      processingTimeout: 30000,
      retryAttempts: 3,
      deadLetterQueue: true,
      ...config
    };
  }

  /**
   * Start the message bus
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('Starting message bus...');

    // Initialize default channels
    await this.initializeDefaultChannels();

    // Start processing pipelines
    await this.startProcessingPipelines();

    console.log('Message bus started successfully');
  }

  /**
   * Stop the message bus
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('Stopping message bus...');

    // Stop processing pipelines
    await this.stopProcessingPipelines();

    console.log('Message bus stopped');
  }

  /**
   * Create a message channel
   */
  createChannel(channelConfig: Omit<MessageChannel, 'subscribers'>): string {
    const channel: MessageChannel = {
      ...channelConfig,
      subscribers: new Set()
    };

    this.channels.set(channel.id, channel);
    console.log(`Created message channel: ${channel.name} (${channel.id})`);
    return channel.id;
  }

  /**
   * Delete a message channel
   */
  deleteChannel(channelId: string): boolean {
    const deleted = this.channels.delete(channelId);
    if (deleted) {
      console.log(`Deleted message channel: ${channelId}`);
    }
    return deleted;
  }

  /**
   * Subscribe to a channel
   */
  async subscribeToChannel(
    channelId: string,
    subscriberId: string,
    handler: EventHandler
  ): Promise<string> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    // Register with event subscriber
    const subscriptionConfig: EventSubscriptionConfig = {
      eventType: `channel:${channelId}`,
      handler: (event, context) => this.processChannelMessage(channelId, event, context!),
      options: {
        retryAttempts: this.config.retryAttempts,
        deadLetterQueue: this.config.deadLetterQueue
      }
    };

    const subscriptionId = await this.eventSubscriber.subscribe(subscriptionConfig);
    channel.subscribers.add(subscriberId);

    console.log(`Subscribed ${subscriberId} to channel ${channelId}`);
    return subscriptionId;
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribeFromChannel(channelId: string, subscriptionId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.subscribers.delete(subscriptionId);
    }

    await this.eventSubscriber.unsubscribe(subscriptionId);
    console.log(`Unsubscribed ${subscriptionId} from channel ${channelId}`);
  }

  /**
   * Publish message to a channel
   */
  async publishToChannel(channelId: string, event: DomainEvent): Promise<void> {
    if (!this.isRunning) return;

    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    // Create channel-specific event
    const channelEvent: DomainEvent = {
      ...event,
      eventType: `channel:${channelId}`,
      metadata: {
        ...event.metadata,
        channelId,
        channelType: channel.type,
        publishedAt: new Date()
      }
    };

    // Apply routing rules first
    const routedEvent = await this.applyRoutingRules(channelEvent);
    if (!routedEvent) return; // Filtered out

    // Apply processing pipeline
    const processedEvent = await this.applyProcessingPipeline(routedEvent);
    if (!processedEvent) return; // Filtered out

    // Publish to channel subscribers
    await this.eventPublisher.publish(processedEvent);

    this.metrics.messagesProcessed++;
    this.metrics.lastActivity = new Date();
  }

  /**
   * Add routing rule
   */
  addRoutingRule(rule: Omit<MessageRoutingRule, 'id'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const routingRule: MessageRoutingRule = {
      ...rule,
      id: ruleId
    };

    this.routingRules.push(routingRule);
    // Sort by priority (higher priority first)
    this.routingRules.sort((a, b) => b.priority - a.priority);

    console.log(`Added routing rule: ${rule.name} (${ruleId})`);
    return ruleId;
  }

  /**
   * Remove routing rule
   */
  removeRoutingRule(ruleId: string): boolean {
    const index = this.routingRules.findIndex(rule => rule.id === ruleId);
    if (index === -1) return false;

    this.routingRules.splice(index, 1);
    console.log(`Removed routing rule: ${ruleId}`);
    return true;
  }

  /**
   * Add processing pipeline
   */
  addProcessingPipeline(pipeline: Omit<MessageProcessingPipeline, 'id'>): string {
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const processingPipeline: MessageProcessingPipeline = {
      ...pipeline,
      id: pipelineId
    };

    this.processingPipelines.push(processingPipeline);
    console.log(`Added processing pipeline: ${pipeline.name} (${pipelineId})`);
    return pipelineId;
  }

  /**
   * Remove processing pipeline
   */
  removeProcessingPipeline(pipelineId: string): boolean {
    const index = this.processingPipelines.findIndex(p => p.id === pipelineId);
    if (index === -1) return false;

    this.processingPipelines.splice(index, 1);
    console.log(`Removed processing pipeline: ${pipelineId}`);
    return true;
  }

  /**
   * Get message bus metrics
   */
  getMetrics(): MessageBusMetrics {
    const avgProcessingTime = this.metrics.processingTimes.length > 0
      ? this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length
      : 0;

    return {
      messagesProcessed: this.metrics.messagesProcessed,
      messagesRouted: this.metrics.messagesRouted,
      messagesFiltered: this.metrics.messagesFiltered,
      messagesTransformed: this.metrics.messagesTransformed,
      processingErrors: this.metrics.processingErrors,
      averageProcessingTime: Math.round(avgProcessingTime),
      channelsActive: this.channels.size,
      rulesActive: this.routingRules.filter(r => r.enabled).length,
      timestamp: new Date()
    };
  }

  /**
   * Get message bus status
   */
  getStatus(): {
    running: boolean;
    channels: number;
    routingRules: number;
    processingPipelines: number;
    subscribers: number;
  } {
    const totalSubscribers = Array.from(this.channels.values())
      .reduce((total, channel) => total + channel.subscribers.size, 0);

    return {
      running: this.isRunning,
      channels: this.channels.size,
      routingRules: this.routingRules.length,
      processingPipelines: this.processingPipelines.length,
      subscribers: totalSubscribers
    };
  }

  private async initializeDefaultChannels(): Promise<void> {
    // Create default system channels
    this.createChannel({
      id: 'system',
      name: 'System Events',
      type: 'broadcast'
    });

    this.createChannel({
      id: 'domain',
      name: 'Domain Events',
      type: 'topic'
    });

    this.createChannel({
      id: 'audit',
      name: 'Audit Events',
      type: 'queue',
      options: { durable: true }
    });

    this.createChannel({
      id: 'errors',
      name: 'Error Events',
      type: 'queue',
      options: { durable: true, ttl: 86400000 } // 24 hours
    });
  }

  private async applyRoutingRules(event: DomainEvent): Promise<DomainEvent | null> {
    if (!this.config.enableRouting) return event;

    for (const rule of this.routingRules) {
      if (!rule.enabled) continue;

      try {
        if (rule.condition(event)) {
          this.metrics.messagesRouted++;

          // Apply transformation if specified
          let transformedEvent = event;
          if (rule.transformation && this.config.enableTransformation) {
            transformedEvent = rule.transformation(event);
            this.metrics.messagesTransformed++;
          }

          // Route to destinations
          for (const destination of rule.destinations) {
            await this.routeToDestination(transformedEvent, destination);
          }

          // If rule has transformation, return transformed event
          if (rule.transformation) {
            return transformedEvent;
          }
        }
      } catch (error) {
        console.error(`Error applying routing rule ${rule.id}:`, error);
        this.metrics.processingErrors++;
      }
    }

    return event;
  }

  private async applyProcessingPipeline(event: DomainEvent): Promise<DomainEvent | null> {
    for (const pipeline of this.processingPipelines) {
      if (!pipeline.enabled) continue;

      try {
        let processedEvent = event;

        for (const stage of pipeline.stages) {
          const startTime = Date.now();

          try {
            const result = await Promise.race([
              stage.handler(processedEvent, { pipelineId: pipeline.id, stageId: stage.id }),
              new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('Processing timeout')), this.config.processingTimeout)
              )
            ]);

            if (result === null) {
              // Event filtered out
              this.metrics.messagesFiltered++;
              return null;
            }

            processedEvent = result;
            this.metrics.processingTimes.push(Date.now() - startTime);

          } catch (error) {
            console.error(`Error in processing stage ${stage.id}:`, error);
            this.metrics.processingErrors++;
            throw error;
          }
        }

        return processedEvent;

      } catch (error) {
        console.error(`Error in processing pipeline ${pipeline.id}:`, error);
        this.metrics.processingErrors++;
        return null; // Drop event on pipeline error
      }
    }

    return event;
  }

  private async routeToDestination(event: DomainEvent, destination: string): Promise<void> {
    // Route to channel or external destination
    if (this.channels.has(destination)) {
      await this.publishToChannel(destination, event);
    } else {
      // External routing (webhook, queue, etc.)
      console.log(`Routing event ${event.eventId} to external destination: ${destination}`);
    }
  }

  private async processChannelMessage(
    channelId: string,
    event: DomainEvent,
    context: any
  ): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    // Channel-specific processing
    switch (channel.type) {
      case 'broadcast':
        // Broadcast to all subscribers
        break;
      case 'topic':
        // Topic-based routing
        break;
      case 'queue':
        // Queue-based (one consumer)
        break;
      case 'direct':
        // Direct routing
        break;
    }

    // Additional channel processing logic would go here
  }

  private async startProcessingPipelines(): Promise<void> {
    // Initialize any pipeline-specific resources
    console.log(`Started ${this.processingPipelines.length} processing pipelines`);
  }

  private async stopProcessingPipelines(): Promise<void> {
    // Clean up pipeline resources
    console.log('Stopped processing pipelines');
  }
}

/**
 * Message Bus Factory
 */
export class MessageBusFactory {
  private static instance: MessageBus | null = null;

  static create(
    eventPublisher: BaseEventPublisher,
    eventSubscriber: BaseEventSubscriber,
    config?: Partial<MessageBusConfig>
  ): MessageBus {
    return new MessageBus(eventPublisher, eventSubscriber, config);
  }

  static getInstance(): MessageBus | null {
    return this.instance;
  }

  static setInstance(bus: MessageBus): void {
    if (this.instance) {
      throw new Error('Message bus instance already exists');
    }
    this.instance = bus;
  }
}

/**
 * Predefined Processing Stages
 */
export class ProcessingStages {
  /**
   * Filter stage - removes events that don't match criteria
   */
  static createFilterStage(
    condition: (event: DomainEvent) => boolean,
    name = 'Filter'
  ): MessageProcessingStage {
    return {
      id: `filter_${Date.now()}`,
      name,
      type: 'filter',
      handler: async (event) => condition(event) ? event : null
    };
  }

  /**
   * Transform stage - modifies event data
   */
  static createTransformStage(
    transformer: (event: DomainEvent) => DomainEvent,
    name = 'Transform'
  ): MessageProcessingStage {
    return {
      id: `transform_${Date.now()}`,
      name,
      type: 'transform',
      handler: async (event) => transformer(event)
    };
  }

  /**
   * Enrich stage - adds additional data to events
   */
  static createEnrichStage(
    enricher: (event: DomainEvent) => Promise<DomainEvent>,
    name = 'Enrich'
  ): MessageProcessingStage {
    return {
      id: `enrich_${Date.now()}`,
      name,
      type: 'enrich',
      handler: enricher
    };
  }

  /**
   * Validate stage - validates event structure
   */
  static createValidateStage(
    validator: (event: DomainEvent) => boolean,
    name = 'Validate'
  ): MessageProcessingStage {
    return {
      id: `validate_${Date.now()}`,
      name,
      type: 'validate',
      handler: async (event) => validator(event) ? event : null
    };
  }

  /**
   * Route stage - routes events to different destinations
   */
  static createRouteStage(
    router: (event: DomainEvent) => string[],
    name = 'Route'
  ): MessageProcessingStage {
    return {
      id: `route_${Date.now()}`,
      name,
      type: 'route',
      handler: async (event) => {
        const destinations = router(event);
        // Add routing metadata
        return {
          ...event,
          metadata: {
            ...event.metadata,
            routedTo: destinations
          }
        };
      }
    };
  }
}

/**
 * Predefined Routing Rules
 */
export class RoutingRules {
  /**
   * Event type based routing
   */
  static createEventTypeRule(
    eventTypes: string[],
    destinations: string[],
    name = 'Event Type Router'
  ): Omit<MessageRoutingRule, 'id'> {
    return {
      name,
      condition: (event) => eventTypes.includes(event.eventType),
      destinations,
      priority: 1,
      enabled: true
    };
  }

  /**
   * Aggregate ID based routing
   */
  static createAggregateRule(
    aggregateIds: string[],
    destinations: string[],
    name = 'Aggregate Router'
  ): Omit<MessageRoutingRule, 'id'> {
    return {
      name,
      condition: (event) => aggregateIds.includes(event.aggregateId),
      destinations,
      priority: 2,
      enabled: true
    };
  }

  /**
   * Error event routing
   */
  static createErrorRule(
    destinations: string[] = ['errors'],
    name = 'Error Router'
  ): Omit<MessageRoutingRule, 'id'> {
    return {
      name,
      condition: (event) => event.eventType.includes('Error') || event.eventType.includes('Failed'),
      destinations,
      priority: 10, // High priority
      enabled: true
    };
  }

  /**
   * Audit event routing
   */
  static createAuditRule(
    auditEventTypes: string[],
    destinations: string[] = ['audit'],
    name = 'Audit Router'
  ): Omit<MessageRoutingRule, 'id'> {
    return {
      name,
      condition: (event) => auditEventTypes.includes(event.eventType),
      destinations,
      priority: 1,
      enabled: true
    };
  }
}
