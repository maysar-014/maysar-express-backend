import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    // Global
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),

    // User Service
    USER_SERVICE_JWT_SECRET: z.string().min(1),
    USER_SERVICE_JWT_EXPIRES_IN: z.string().min(1),

    // Auth Service
    AUTH_SERVICE_SESSION_SECRET: z.string().min(1),

    // Catalog Service
    CATALOG_SERVICE_DB_HOST: z.string().min(1),
    CATALOG_SERVICE_DB_PORT: z.string().regex(/^\d+$/).transform(Number),
    CATALOG_SERVICE_DB_NAME: z.string().min(1),
    CATALOG_SERVICE_DB_USER: z.string().min(1),
    CATALOG_SERVICE_DB_PASSWORD: z.string().min(1),

    // SMS Service
    SMS_SERVICE_API_KEY: z.string().min(1),
    SMS_SERVICE_PROVIDER: z.string().min(1),

    // Add more as needed...
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (): Env => {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:', result.error.format());
        process.exit(1);
    }

    return result.data;
};

export const env = validateEnv();
