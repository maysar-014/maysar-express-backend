import { env } from './env-validator';

export const config = {
    nodeEnv: env.NODE_ENV,
    database: {
        url: env.DATABASE_URL,
    },
    redis: {
        url: env.REDIS_URL,
    },
    services: {
        user: {
            jwtSecret: env.USER_SERVICE_JWT_SECRET,
            jwtExpiresIn: env.USER_SERVICE_JWT_EXPIRES_IN,
        },
        auth: {
            sessionSecret: env.AUTH_SERVICE_SESSION_SECRET,
        },
        catalog: {
            dbHost: env.CATALOG_SERVICE_DB_HOST,
            dbPort: env.CATALOG_SERVICE_DB_PORT,
            dbName: env.CATALOG_SERVICE_DB_NAME,
            dbUser: env.CATALOG_SERVICE_DB_USER,
            dbPassword: env.CATALOG_SERVICE_DB_PASSWORD,
        },
        sms: {
            provider: env.SMS_PROVIDER || env.SMS_SERVICE_PROVIDER || 'mock',
            apiKey: env.MESEJI_API_KEY || env.SMS_SERVICE_API_KEY,
            senderId: env.MESEJI_SENDER_ID,
            baseUrl: env.MESEJI_BASE_URL,
        }
    }
};

export type Config = typeof config;
