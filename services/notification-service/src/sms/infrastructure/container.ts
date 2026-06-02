import { Container } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';
import { TYPES } from './types';

// Interfaces
import { ISmsRepository } from '../domain/repositories/sms.repository';
import { ISmsProvider } from './providers/sms-provider.interface';
import { IEventPublisher } from './messaging/event-publisher';

// Implementations
import { PrismaSmsRepository } from './repositories/prisma-sms.repository';
import { MockSmsProvider } from './providers/mock-sms.provider';
import { MesejiSmsProvider } from './providers/meseji-sms.provider';
import { EventPublisher } from './messaging/event-publisher';

// Policies
import { RetryPolicy } from '../domain/policies/retry.policy';
import { RateLimitPolicy } from '../domain/policies/rate-limit.policy';

// Use Cases
import { SendSmsUseCase } from '../application/use-cases/send-sms.use-case';
import { TrackDeliveryUseCase } from '../application/use-cases/track-delivery.use-case';
import { HandleDeliveryReportUseCase } from '../application/use-cases/handle-delivery-report.use-case';
import { RetryFailedMessagesUseCase } from '../application/use-cases/retry-failed-messages.use-case';
import { GetStatisticsUseCase } from '../application/use-cases/get-statistics.use-case';

// Controllers
import { SmsController } from '../api/controllers/sms.controller';

export const container = new Container();

// Core dependencies
container.bind<PrismaClient>(TYPES.PrismaClient).toConstantValue(createPrismaClient());

// Infrastructure
container.bind<ISmsRepository>(TYPES.SmsRepository).toDynamicValue((context) => {
    const prisma = context.container.get<PrismaClient>(TYPES.PrismaClient);
    return new PrismaSmsRepository(prisma);
}).inSingletonScope();
container.bind<IEventPublisher>(TYPES.EventPublisher).to(EventPublisher).inSingletonScope();

// Provider selection based on config
const smsProviderName = (process.env.SMS_PROVIDER || process.env.SMS_SERVICE_PROVIDER || 'mock').toLowerCase();
const parseOptionalInt = (value?: string): number | undefined => {
    if (!value) {
        return undefined;
    }
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
};
const mesejiBaseUrl = process.env.MESEJI_BASE_URL || '';
const perUserLimitPerHour = parseOptionalInt(process.env.SMS_RATE_LIMIT_PER_USER_PER_HOUR);
const perPhoneNumberLimitPerDay = parseOptionalInt(process.env.SMS_RATE_LIMIT_PER_PHONE_NUMBER_PER_DAY);
const apiKeyStatus = (process.env.MESEJI_API_KEY || process.env.SMS_SERVICE_API_KEY) ? 'set' : 'missing';
const hasBaseUrlOverride = Boolean(process.env.MESEJI_BASE_URL);
// One-time startup log to verify env resolution (no secrets).
const smsGlobal = globalThis as typeof globalThis & { __smsEnvLogged?: boolean };
if (!smsGlobal.__smsEnvLogged) {
    smsGlobal.__smsEnvLogged = true;
    process.stdout.write(
        `[sms] provider=${smsProviderName} baseUrl=${mesejiBaseUrl || 'n/a'} ` +
        `baseUrlOverride=${hasBaseUrlOverride ? 'yes' : 'no'} apiKey=${apiKeyStatus} ` +
        `node_env=${process.env.NODE_ENV || 'development'}\n`
    );
}
if (smsProviderName === 'mock') {
    container.bind<ISmsProvider>(TYPES.SmsProvider).toConstantValue(new MockSmsProvider());
} else if (smsProviderName === 'meseji') {
    container.bind<ISmsProvider>(TYPES.SmsProvider).toConstantValue(new MesejiSmsProvider({
        apiKey: process.env.MESEJI_API_KEY || process.env.SMS_SERVICE_API_KEY,
        senderId: process.env.MESEJI_SENDER_ID,
        baseUrl: process.env.MESEJI_BASE_URL
    }));
} else {
    throw new Error(`Unsupported SMS provider "${smsProviderName}". Configure SMS_PROVIDER=mock or SMS_PROVIDER=meseji.`);
}

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
    maxMessagesPerDay: parseInt(process.env.SMS_RATE_LIMIT_PER_DAY || '10000', 10),
    perUserLimitPerHour,
    perPhoneNumberLimitPerDay
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

container.bind<HandleDeliveryReportUseCase>(TYPES.HandleDeliveryReportUseCase).toDynamicValue((context) => {
    return new HandleDeliveryReportUseCase(
        context.container.get<ISmsRepository>(TYPES.SmsRepository),
        context.container.get<ISmsProvider>(TYPES.SmsProvider)
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
