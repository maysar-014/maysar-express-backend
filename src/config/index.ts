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
            apiKey: env.SMS_SERVICE_API_KEY,
            provider: env.SMS_SERVICE_PROVIDER,
        }
    }
};

export type Config = typeof config;
