export const kafkaConfig = {
    clientId: 'training-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    groupId: 'training-service-group',
    topics: {
        trainingStarted: 'training.started',
        trainingCompleted: 'training.completed',
        certificationExpired: 'certification.expired',
        courierEligibilityChanged: 'courier.eligibility.changed',
        courierRegistered: 'courier.registered'
    }
};
