import Joi from 'joi';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
    PORT: Joi.number().default(3000),

    // Critical Infrastructure
    DATABASE_URL: Joi.string().required(),
    REDIS_URL: Joi.string().required(),

    // Security — Production enforcement
    JWT_SECRET: isProduction
        ? Joi.string().min(32).required().messages({
            'string.min': 'JWT_SECRET must be at least 32 characters in production',
            'any.required': 'JWT_SECRET is required in production',
        })
        : Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().default('7d'),

    // Payment Gateway — URL validation
    PAYMENT_GATEWAY_URL: isProduction
        ? Joi.string().uri().required()
        : Joi.string().uri(),

    // Logging
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown(false).required();

export const validateEnv = () => {
    // Only validate the specific environment variables we care about.
    // Passing the entire process.env object with .unknown(false) would reject
    // system variables (PATH, USERPROFILE, etc.) and npm variables.
    const envToValidate: Record<string, string | undefined> = {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
        PAYMENT_GATEWAY_URL: process.env.PAYMENT_GATEWAY_URL,
        LOG_LEVEL: process.env.LOG_LEVEL,
    };

    const { error, value } = envSchema.validate(envToValidate, { abortEarly: false });

    if (error) {
        console.error('❌ Environment validation failed. Missing or invalid variables:');
        error.details.forEach((detail) => {
            console.error(`   - ${detail.message}`);
        });
        process.exit(1);
    }

    // Production-specific secret strength checks
    if (isProduction) {
        const weakPatterns = ['dev-', 'test-', 'default', 'change-me', 'maysar'];
        const secretsToCheck = [
            process.env.JWT_SECRET,
            process.env.POSTGRES_PASSWORD,
            process.env.REDIS_PASSWORD,
        ];
        for (const secret of secretsToCheck) {
            if (secret && weakPatterns.some((w) => secret.toLowerCase().includes(w))) {
                console.error('❌ Production secret contains weak/default pattern');
                process.exit(1);
            }
        }
    }

    return value;
};

