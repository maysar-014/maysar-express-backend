export const TYPES = {
    PrismaClient: Symbol.for('PrismaClient'),
    EventBus: Symbol.for('EventBus'),

    // SMS Service Types
    SmsRepository: Symbol.for('SmsRepository'),
    SmsProvider: Symbol.for('SmsProvider'),
    EventPublisher: Symbol.for('EventPublisher'),

    // Policies
    RetryPolicy: Symbol.for('RetryPolicy'),
    RateLimitPolicy: Symbol.for('RateLimitPolicy'),

    // Use Cases
    SendSmsUseCase: Symbol.for('SendSmsUseCase'),
    TrackDeliveryUseCase: Symbol.for('TrackDeliveryUseCase'),
    RetryFailedMessagesUseCase: Symbol.for('RetryFailedMessagesUseCase'),
    GetStatisticsUseCase: Symbol.for('GetStatisticsUseCase'),

    // Controllers
    SmsController: Symbol.for('SmsController')
};
