import Joi from 'joi';

const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(3000),

    // Critical Infrastructure
    DATABASE_URL: Joi.string().required(),
    REDIS_URL: Joi.string().default('redis://localhost:6379'),

    // Security
    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().default('7d'),

    // External Services (Optional in Dev, likely Required in Prod - adjusting as per strictness)
    // We make them optional here to avoid breaking local dev if not strictly needed immediately
    // In a strict production mode, these should be required.
    SUPABASE_URL: Joi.string().optional(),
    SUPABASE_ANON_KEY: Joi.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().optional(),

    // Logging
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown().required();

export const validateEnv = () => {
    const { error, value } = envSchema.validate(process.env, { abortEarly: false });

    if (error) {
        console.error('❌ Environment validation failed. Missing or invalid variables:');
        error.details.forEach((detail) => {
            console.error(`   - ${detail.message}`);
        });
        process.exit(1);
    }

    return value;
};
