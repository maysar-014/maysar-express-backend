/**
 * Payment Service Configuration
 * Validates environment variables and exports configuration object
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.string().transform(Number).default('3004'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    SELCOM_PESA_MERCHANT_CODE: z.string().optional(),
    SELCOM_PESA_API_KEY: z.string().optional(),
    SELCOM_PESA_BASE_URL: z.string().url().optional(),
    SELCOM_PESA_CALLBACK_URL: z.string().url().optional(),
    BASE_URL: z.string().url().default('http://localhost:3000'),
    JWT_SECRET: z.string().min(32),
});

const parsedEnv = envSchema.safeParse({
    ...process.env,
});

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
    paymentGateway: {
        merchantCode: parsedEnv.data.SELCOM_PESA_MERCHANT_CODE,
        apiKey: parsedEnv.data.SELCOM_PESA_API_KEY,
        baseUrl: parsedEnv.data.SELCOM_PESA_BASE_URL,
        callbackUrl: parsedEnv.data.SELCOM_PESA_CALLBACK_URL,
    },
    app: {
        baseUrl: parsedEnv.data.BASE_URL,
        jwtSecret: parsedEnv.data.JWT_SECRET,
    },
};


