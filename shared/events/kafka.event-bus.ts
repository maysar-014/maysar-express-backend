import { Kafka, Producer, Consumer, EachMessagePayload, logLevel } from 'kafkajs';
import { IEventPublisher, IEventSubscriber, EventEnvelope } from './eventBus';

export interface KafkaEventBusConfig {
    brokers: string[];
    clientId: string;
    groupId: string;
    connectionTimeout?: number;
    requestTimeout?: number;
    retry?: {
        initialRetryTime?: number;
        retries?: number;
    };
}

const defaultConfig: KafkaEventBusConfig = {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'maysar-backend',
    groupId: process.env.KAFKA_GROUP_ID || 'maysar-consumer-group',
    connectionTimeout: 10000,
    requestTimeout: 30000,
    retry: {
        initialRetryTime: 300,
        retries: 8
    }
};

export class KafkaEventBus implements IEventPublisher, IEventSubscriber {
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;
    private isProducerConnected = false;
    private isConsumerConnected = false;
    private subscriptionHandlers = new Map<string, Array<(envelope: EventEnvelope) => Promise<void>>>();

    constructor(config: Partial<KafkaEventBusConfig> = {}) {
        const mergedConfig = { ...defaultConfig, ...config };

        this.kafka = new Kafka({
            clientId: mergedConfig.clientId,
            brokers: mergedConfig.brokers,
            connectionTimeout: mergedConfig.connectionTimeout,
            requestTimeout: mergedConfig.requestTimeout,
            retry: mergedConfig.retry,
            logLevel: logLevel.WARN
        });

        this.producer = this.kafka.producer({
            allowAutoTopicCreation: true,
            transactionTimeout: 30000
        });

        this.consumer = this.kafka.consumer({
            groupId: mergedConfig.groupId,
            sessionTimeout: 30000,
            heartbeatInterval: 3000
        });
    }

    async connect(): Promise<void> {
        if (!this.isProducerConnected) {
            await this.producer.connect();
            this.isProducerConnected = true;
            console.log('[KafkaEventBus] Producer connected');
        }
    }

    async disconnect(): Promise<void> {
        if (this.isProducerConnected) {
            await this.producer.disconnect();
            this.isProducerConnected = false;
            console.log('[KafkaEventBus] Producer disconnected');
        }
        if (this.isConsumerConnected) {
            await this.consumer.disconnect();
            this.isConsumerConnected = false;
            console.log('[KafkaEventBus] Consumer disconnected');
        }
    }

    async publish(eventType: string, data: any, metadata?: any): Promise<void> {
        if (!this.isProducerConnected) {
            await this.connect();
        }

        const envelope: EventEnvelope = {
            eventType,
            data,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString()
            }
        };

        const topic = this.eventTypeToTopic(eventType);

        await this.producer.send({
            topic,
            messages: [
                {
                    key: metadata?.aggregateId || metadata?.correlationId || null,
                    value: JSON.stringify(envelope),
                    headers: {
                        eventType,
                        timestamp: new Date().toISOString(),
                        ...(metadata?.correlationId ? { correlationId: metadata.correlationId } : {})
                    }
                }
            ]
        });

        console.log(`[KafkaEventBus] Published event: ${eventType} to topic: ${topic}`);
    }

    async subscribe(
        eventType: string,
        handlerOrOptions: ((envelope: EventEnvelope) => Promise<void>) | { name: string; handler: (envelope: EventEnvelope) => Promise<void> }
    ): Promise<void> {
        const handler = typeof handlerOrOptions === 'function'
            ? handlerOrOptions
            : handlerOrOptions.handler;

        if (!this.subscriptionHandlers.has(eventType)) {
            this.subscriptionHandlers.set(eventType, []);
        }
        this.subscriptionHandlers.get(eventType)!.push(handler);

        const topic = this.eventTypeToTopic(eventType);

        if (!this.isConsumerConnected) {
            await this.consumer.connect();
            this.isConsumerConnected = true;
        }

        await this.consumer.subscribe({ topic, fromBeginning: false });

        // Run consumer if not already running (idempotent setup)
        await this.consumer.run({
            eachMessage: async ({ topic: msgTopic, partition, message }: EachMessagePayload) => {
                try {
                    const envelope: EventEnvelope = JSON.parse(message.value?.toString() || '{}');
                    const handlers = this.subscriptionHandlers.get(envelope.eventType) || [];

                    for (const h of handlers) {
                        try {
                            await h(envelope);
                        } catch (error) {
                            console.error(`[KafkaEventBus] Handler error for ${envelope.eventType}:`, error);
                        }
                    }
                } catch (error) {
                    console.error(`[KafkaEventBus] Failed to process message from ${msgTopic}:`, error);
                }
            }
        });

        console.log(`[KafkaEventBus] Subscribed to: ${eventType} (topic: ${topic})`);
    }

    /**
     * Converts dot-notation event types to Kafka-friendly topic names.
     * e.g. "Payment.Success" -> "payment-success"
     * e.g. "inventory.reserved.v1" -> "inventory-reserved-v1"
     */
    private eventTypeToTopic(eventType: string): string {
        return eventType
            .replace(/\./g, '-')
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();
    }
}

// Singleton instance for shared use across the application
let kafkaEventBusInstance: KafkaEventBus | null = null;

export function getKafkaEventBus(config?: Partial<KafkaEventBusConfig>): KafkaEventBus {
    if (!kafkaEventBusInstance) {
        kafkaEventBusInstance = new KafkaEventBus(config);
    }
    return kafkaEventBusInstance;
}
