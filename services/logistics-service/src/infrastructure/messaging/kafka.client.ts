import { Kafka, Producer, Consumer, KafkaConfig as KafkaJSConfig } from 'kafkajs';
import { KafkaConfiguration } from '../../config/kafka.config';

export class KafkaClientManager {
  private static instance: KafkaClientManager;
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private isConnected = false;

  private constructor() {}

  static getInstance(): KafkaClientManager {
    if (!KafkaClientManager.instance) {
      KafkaClientManager.instance = new KafkaClientManager();
    }
    return KafkaClientManager.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    const config = KafkaConfiguration.getInstance().getConfig();
    
    const kafkaConfig: KafkaJSConfig = {
      clientId: config.clientId,
      brokers: config.brokers,
      connectionTimeout: config.connectionTimeout,
      requestTimeout: config.requestTimeout,
      retry: config.retry
    };

    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: config.groupId });

    await this.producer.connect();
    await this.consumer.connect();
    
    this.isConnected = true;
    console.log('✅ Kafka connected successfully');
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }
    if (this.consumer) {
      await this.consumer.disconnect();
    }
    
    this.kafka = null;
    this.producer = null;
    this.consumer = null;
    this.isConnected = false;
    console.log('✅ Kafka disconnected');
  }

  async publishEvent(topic: string, message: any): Promise<void> {
    if (!this.producer) {
      await this.connect();
    }

    await this.producer!.send({
      topic,
      messages: [{
        value: JSON.stringify(message),
        timestamp: Date.now().toString()
      }]
    });
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Simple health check by checking connection
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime
      };
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}