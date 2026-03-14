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
    PESAPAL_SECRET_KEY: z.string().min(8),
    PESAPAL_WEBHOOK_SECRET: z.string().optional(),
    PESAPAL_URL: z.string().url().default('https://api.pesapal.com/v3'),
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
    pesapal: {
        secretKey: parsedEnv.data.PESAPAL_SECRET_KEY,
        webhookSecret: parsedEnv.data.PESAPAL_WEBHOOK_SECRET,
        url: parsedEnv.data.PESAPAL_URL,
    },
    app: {
        baseUrl: parsedEnv.data.BASE_URL,
        jwtSecret: parsedEnv.data.JWT_SECRET,
    },
};


