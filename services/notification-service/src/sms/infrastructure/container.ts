import { Container } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { TYPES } from './types';

// Interfaces
import { ISmsRepository } from '../domain/repositories/sms.repository';
import { ISmsProvider } from './providers/sms-provider.interface';
import { IEventPublisher } from './messaging/event-publisher';

// Implementations
import { PrismaSmsRepository } from './repositories/prisma-sms.repository';
import { MockSmsProvider } from './providers/mock-sms.provider';
import { AfricasTalkingSmsProvider } from './providers/africastalking-sms.provider';
import { EventPublisher } from './messaging/event-publisher';

// Policies
import { RetryPolicy } from '../domain/policies/retry.policy';
import { RateLimitPolicy } from '../domain/policies/rate-limit.policy';

// Use Cases
import { SendSmsUseCase } from '../application/use-cases/send-sms.use-case';
import { TrackDeliveryUseCase } from '../application/use-cases/track-delivery.use-case';
import { RetryFailedMessagesUseCase } from '../application/use-cases/retry-failed-messages.use-case';
import { GetStatisticsUseCase } from '../application/use-cases/get-statistics.use-case';

// Controllers
import { SmsController } from '../api/controllers/sms.controller';

export const container = new Container();

// Core dependencies
container.bind<PrismaClient>(TYPES.PrismaClient).toConstantValue(new PrismaClient());

// Infrastructure
container.bind<ISmsRepository>(TYPES.SmsRepository).to(PrismaSmsRepository).inSingletonScope();
container.bind<IEventPublisher>(TYPES.EventPublisher).to(EventPublisher).inSingletonScope();

// Provider selection based on config
const smsProviderName = (process.env.SMS_PROVIDER || process.env.SMS_SERVICE_PROVIDER || 'africastalking').toLowerCase();
const provider = smsProviderName === 'africastalking'
    ? new AfricasTalkingSmsProvider({
        username: process.env.AFRICASTALKING_USERNAME || process.env.SMS_SERVICE_USERNAME || 'sandbox',
        apiKey: process.env.AFRICASTALKING_API_KEY || process.env.SMS_SERVICE_API_KEY || 'sandbox',
        senderId: process.env.AFRICASTALKING_SENDER_ID
    })
    : new MockSmsProvider({ shouldFail: false });

container.bind<ISmsProvider>(TYPES.SmsProvider).toConstantValue(provider);

// Policies
container.bind<RetryPolicy>(TYPES.RetryPolicy).toConstantValue(new RetryPolicy({
    maxRetries: parseInt(process.env.SMS_MAX_RETRIES || '3', 10),
    baseDelayMs: 1000,
    maxDelayMs: 300000,
    backoffMultiplier: 2
}));

container.bind<RateLimitPolicy>(TYPES.RateLimitPolicy).toConstantValue(new RateLimitPolicy({
    maxMessagesPerMinute: parseInt(process.env.SMS_RATE_LIMIT_PER_MINUTE || '60', 10),
    maxMessagesPerHour: parseInt(process.env.SMS_RATE_LIMIT_PER_HOUR || '1000', 10),
    maxMessagesPerDay: parseInt(process.env.SMS_RATE_LIMIT_PER_DAY || '10000', 10)
}));

// Use Cases
container.bind<SendSmsUseCase>(TYPES.SendSmsUseCase).toDynamicValue((context) => {
    return new SendSmsUseCase(
        context.container.get<ISmsRepository>(TYPES.SmsRepository),
        context.container.get<ISmsProvider>(TYPES.SmsProvider),
        context.container.get<RateLimitPolicy>(TYPES.RateLimitPolicy),
        context.container.get<IEventPublisher>(TYPES.EventPublisher)
    );
});

container.bind<TrackDeliveryUseCase>(TYPES.TrackDeliveryUseCase).toDynamicValue((context) => {
    return new TrackDeliveryUseCase(
        context.container.get<ISmsRepository>(TYPES.SmsRepository)
    );
});

container.bind<RetryFailedMessagesUseCase>(TYPES.RetryFailedMessagesUseCase).toDynamicValue((context) => {
    return new RetryFailedMessagesUseCase(
        context.container.get<ISmsRepository>(TYPES.SmsRepository),
        context.container.get<ISmsProvider>(TYPES.SmsProvider),
        context.container.get<RetryPolicy>(TYPES.RetryPolicy),
        context.container.get<IEventPublisher>(TYPES.EventPublisher)
    );
});

container.bind<GetStatisticsUseCase>(TYPES.GetStatisticsUseCase).toDynamicValue((context) => {
    return new GetStatisticsUseCase(
        context.container.get<ISmsRepository>(TYPES.SmsRepository)
    );
});

// Controllers
container.bind<SmsController>(TYPES.SmsController).to(SmsController).inSingletonScope();
