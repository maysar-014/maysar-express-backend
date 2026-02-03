/**
 * Payment Service Configuration
 * Validates environment variables and exports configuration object
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().transform(Number).default('3004'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    KAFKA_BROKERS: z.string().default('localhost:9092'),
    KAFKA_CLIENT_ID: z.string().default('payment-service'),
    PESAPAL_CONSUMER_KEY: z.string(),
    PESAPAL_CONSUMER_SECRET: z.string(),
    PESAPAL_URL: z.string().url().default('https://cybqa.pesapal.com/pesapalv3'),
    BASE_URL: z.string().url().default('http://localhost:3000'),
    JWT_SECRET: z.string().min(32),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
    process.exit(1);
}

export const config = {
    env: parsedEnv.data.NODE_ENV,
    port: parsedEnv.data.PORT,
    db: {
        url: parsedEnv.data.DATABASE_URL,
    },
    redis: {
        url: parsedEnv.data.REDIS_URL,
    },
    kafka: {
        brokers: parsedEnv.data.KAFKA_BROKERS.split(','),
        clientId: parsedEnv.data.KAFKA_CLIENT_ID,
    },
    pesapal: {
        consumerKey: parsedEnv.data.PESAPAL_CONSUMER_KEY,
        consumerSecret: parsedEnv.data.PESAPAL_CONSUMER_SECRET,
        url: parsedEnv.data.PESAPAL_URL,
    },
    app: {
        baseUrl: parsedEnv.data.BASE_URL,
        jwtSecret: parsedEnv.data.JWT_SECRET,
    },
};
