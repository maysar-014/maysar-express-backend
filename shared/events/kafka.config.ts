import { KafkaConfig, ProducerConfig, ConsumerConfig } from 'kafkajs';

export const kafkaConfig: KafkaConfig = {
    clientId: process.env.KAFKA_CLIENT_ID || 'maysar-backend',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
};

export const producerConfig: ProducerConfig = {
    allowAutoTopicCreation: true,
    transactionalId: process.env.SERVICE_NAME ? `${process.env.SERVICE_NAME}-producer` : undefined,
};

export const consumerConfig: ConsumerConfig = {
    groupId: process.env.SERVICE_NAME || 'maysar-default-group',
    allowAutoTopicCreation: true,
};

export const topicConfig = {
    replicationFactor: process.env.KAFKA_REPLICATION_FACTOR ? parseInt(process.env.KAFKA_REPLICATION_FACTOR) : 1,
    numPartitions: process.env.KAFKA_PARTITIONS ? parseInt(process.env.KAFKA_PARTITIONS) : 3,
};

export const defaultRetryPolicy = {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    factor: 2
};
