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
    PESAPAL_CONSUMER_KEY: z.string().min(8),
    PESAPAL_CONSUMER_SECRET: z.string().min(8),
    PESAPAL_IPN_ID: z.string().optional(),
    PESAPAL_URL: z.string().url().default('https://cybqa.pesapal.com/pesapalv3'),
    BASE_URL: z.string().url().default('http://localhost:3000'),
    JWT_SECRET: z.string().min(32),
});

const parsedEnv = envSchema.safeParse({
    ...process.env,
    PESAPAL_CONSUMER_SECRET: process.env.PESAPAL_CONSUMER_SECRET ?? process.env.PESAPAL_SECRET_KEY,
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
    pesapal: {
        consumerKey: parsedEnv.data.PESAPAL_CONSUMER_KEY,
        consumerSecret: parsedEnv.data.PESAPAL_CONSUMER_SECRET,
        ipnId: parsedEnv.data.PESAPAL_IPN_ID,
        url: parsedEnv.data.PESAPAL_URL,
    },
    app: {
        baseUrl: parsedEnv.data.BASE_URL,
        jwtSecret: parsedEnv.data.JWT_SECRET,
    },
};


