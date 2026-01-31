import { Kafka, Producer, Consumer } from 'kafkajs';
import { kafkaConfig, producerConfig, consumerConfig } from './kafka.config';
import { v4 as uuidv4 } from 'uuid';
import { EventMetadata, createEventMetadata, metadataToHeaders } from './metadata';
import { eventRegistry } from './registry/base';
import { initializeEventRegistry } from './registry/index';

export interface EventEnvelope {
  metadata: EventMetadata;
  data: any;
  eventType: string;
}

export interface EventConsumer {
  name: string;
  handler: (envelope: EventEnvelope) => Promise<void>;
}

export interface IEventPublisher {
  publish(eventType: string, data: any, metadata?: Partial<EventMetadata>): Promise<void>;
}

export class KafkaEventPublisher implements IEventPublisher {
  private producer: Producer;
  private kafka: Kafka;

  constructor() {
    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer(producerConfig);
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publish(eventType: string, data: any, metadata?: Partial<EventMetadata>): Promise<void> {
    // 1. Validate schema if registered
    const version = metadata?.version || 'v1';
    const validation = eventRegistry.validate(eventType, data, version);
    if (!validation.valid) {
      throw new Error(`Event validation failed for ${eventType}: ${validation.errors?.join(', ')}`);
    }

    // 2. Create standardized envelope
    const source = metadata?.source || process.env.SERVICE_NAME || 'unknown-service';
    const standardMetadata = createEventMetadata(source, metadata);

    const envelope: EventEnvelope = {
      metadata: standardMetadata,
      data,
      eventType
    };

    // 3. Send to Kafka
    await this.producer.send({
      topic: eventType,
      messages: [
        {
          key: standardMetadata.idempotencyKey || standardMetadata.requestId,
          value: JSON.stringify(envelope),
          headers: metadataToHeaders(standardMetadata)
        }
      ]
    });
  }
}

export class KafkaEventSubscriber {
  private consumer: Consumer;
  private kafka: Kafka;
  private handlers: Map<string, (envelope: EventEnvelope) => Promise<void>> = new Map();

  constructor() {
    this.kafka = new Kafka(kafkaConfig);
    this.consumer = this.kafka.consumer(consumerConfig);
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  async subscribe(topic: string, handler: (envelope: EventEnvelope) => Promise<void>): Promise<void> {
    this.handlers.set(topic, handler);
    await this.consumer.subscribe({ topic, fromBeginning: true });
  }

  async start(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const handler = this.handlers.get(topic);
        if (handler && message.value) {
          try {
            const envelope: EventEnvelope = JSON.parse(message.value.toString());

            // Basic idempotency check could happen here using envelope.metadata.idempotencyKey

            await handler(envelope);
          } catch (error) {
            console.error(`Error processing message from topic ${topic}:`, error);

            // DEAD LETTER QUEUE (DLQ) LOGIC
            await this.handleProcessingError(topic, message, error);
          }
        }
      }
    });
  }

  private async handleProcessingError(topic: string, message: any, error: any): Promise<void> {
    const dlqTopic = `${topic}.dlq`;
    console.error(`Moving failed message to ${dlqTopic}`);

    // In a real implementation, we would publish to the DLQ topic here
    // For now, we'll just log it clearly as per Phase 1.3
  }
}

export class KafkaEventBus {
  private publisher: KafkaEventPublisher;
  private subscriber: KafkaEventSubscriber;

  constructor() {
    this.publisher = new KafkaEventPublisher();
    this.subscriber = new KafkaEventSubscriber();
  }

  async connect(): Promise<void> {
    initializeEventRegistry(); // Initialize schemas
    await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
  }

  async publish(eventType: string, data: any, metadata?: Partial<EventMetadata>): Promise<void> {
    await this.publisher.publish(eventType, data, metadata);
  }

  async subscribe(eventType: string, consumer: EventConsumer): Promise<void> {
    await this.subscriber.subscribe(eventType, consumer.handler);
  }

  async start(): Promise<void> {
    await this.subscriber.start();
  }
}

export const eventBus = new KafkaEventBus();