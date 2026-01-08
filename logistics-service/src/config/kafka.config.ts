export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  connectionTimeout: number;
  requestTimeout: number;
  retry: {
    retries: number;
    initialRetryTime: number;
    maxRetryTime: number;
  };
}

export class KafkaConfiguration {
  private static instance: KafkaConfiguration;
  private config: KafkaConfig;

  private constructor() {
    this.config = {
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      clientId: process.env.KAFKA_CLIENT_ID || 'logistics-service',
      groupId: process.env.KAFKA_GROUP_ID || 'logistics-service-group',
      connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || '10000'),
      requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || '30000'),
      retry: {
        retries: parseInt(process.env.KAFKA_RETRIES || '5'),
        initialRetryTime: parseInt(process.env.KAFKA_INITIAL_RETRY_TIME || '300'),
        maxRetryTime: parseInt(process.env.KAFKA_MAX_RETRY_TIME || '30000')
      }
    };
  }

  static getInstance(): KafkaConfiguration {
    if (!KafkaConfiguration.instance) {
      KafkaConfiguration.instance = new KafkaConfiguration();
    }
    return KafkaConfiguration.instance;
  }

  getConfig(): KafkaConfig {
    return this.config;
  }
}