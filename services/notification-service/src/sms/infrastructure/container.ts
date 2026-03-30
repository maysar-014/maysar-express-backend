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
import { AfricasTalkingSmsProvider } from './providers/africastalking-sms.provider';
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
const smsProviderName = (process.env.SMS_PROVIDER || process.env.SMS_SERVICE_PROVIDER || 'africastalking').toLowerCase();
const parseOptionalInt = (value?: string): number | undefined => {
    if (!value) {
        return undefined;
    }
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
};
const isProduction = process.env.NODE_ENV === 'production';
const allowLiveInDev = (process.env.SMS_ALLOW_LIVE_IN_DEV || '').toLowerCase() === 'true';
const africasTalkingEnvRaw = (process.env.AFRICASTALKING_ENV || (isProduction ? 'live' : 'sandbox')).toLowerCase();
const isLiveRequested = africasTalkingEnvRaw === 'live';
const africasTalkingEnv = isLiveRequested && (isProduction || allowLiveInDev) ? 'live' : 'sandbox';
const perUserLimitPerHour = parseOptionalInt(process.env.SMS_RATE_LIMIT_PER_USER_PER_HOUR);
const perPhoneNumberLimitPerDay = parseOptionalInt(process.env.SMS_RATE_LIMIT_PER_PHONE_NUMBER_PER_DAY);
const resolvedBaseUrl = (process.env.AFRICASTALKING_BASE_URL ||
    (africasTalkingEnv === 'sandbox'
        ? 'https://api.sandbox.africastalking.com/version1'
        : 'https://api.africastalking.com/version1')).replace(/\/+$/, '');
const resolvedUsername = process.env.AFRICASTALKING_USERNAME || process.env.SMS_SERVICE_USERNAME || 'sandbox';
const apiKeyStatus = (process.env.AFRICASTALKING_API_KEY || process.env.SMS_SERVICE_API_KEY) ? 'set' : 'missing';
const hasBaseUrlOverride = Boolean(process.env.AFRICASTALKING_BASE_URL);
// One-time startup log to verify env resolution (no secrets).
const smsGlobal = globalThis as typeof globalThis & { __smsEnvLogged?: boolean };
if (!smsGlobal.__smsEnvLogged) {
    smsGlobal.__smsEnvLogged = true;
    process.stdout.write(
        `[sms] provider=${smsProviderName} env=${africasTalkingEnv} baseUrl=${resolvedBaseUrl} ` +
        `baseUrlOverride=${hasBaseUrlOverride ? 'yes' : 'no'} username=${resolvedUsername} ` +
        `apiKey=${apiKeyStatus} allowLiveInDev=${allowLiveInDev ? 'true' : 'false'} ` +
        `node_env=${process.env.NODE_ENV || 'development'}\n`
    );
}
if (smsProviderName !== 'africastalking') {
    throw new Error(`Unsupported SMS provider "${smsProviderName}". Configure SMS_PROVIDER=africastalking.`);
}

const apiKey = process.env.AFRICASTALKING_API_KEY || process.env.SMS_SERVICE_API_KEY;

const provider = (() => {
    if (!apiKey) {
        throw new Error('Missing AFRICASTALKING_API_KEY (or SMS_SERVICE_API_KEY). SMS provider cannot be initialized.');
    }

    return new AfricasTalkingSmsProvider({
        username: resolvedUsername,
        apiKey,
        senderId: process.env.AFRICASTALKING_SENDER_ID,
        environment: africasTalkingEnv,
        baseUrl: resolvedBaseUrl,
        bulkSMSMode: parseOptionalInt(process.env.AFRICASTALKING_BULK_SMS_MODE),
        enqueue: parseOptionalInt(process.env.AFRICASTALKING_ENQUEUE),
        keyword: process.env.AFRICASTALKING_KEYWORD,
        linkId: process.env.AFRICASTALKING_LINK_ID,
        retryDurationInHours: parseOptionalInt(process.env.AFRICASTALKING_RETRY_DURATION_HOURS)
    });
})();

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
