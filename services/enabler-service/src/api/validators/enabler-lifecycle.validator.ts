import Joi from 'joi';

const NON_BLANK_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F-\u009F]+$/u;

/**
 * Terms acceptance body (§6). Only the version the enabler is accepting is
 * accepted from the client; timestamps are always server-generated.
 */
export const acceptEnablerTermsBodySchema = Joi.object({
    termsVersion: Joi.string().trim().max(32).pattern(NON_BLANK_PATTERN).required(),
}).unknown(false);

/**
 * Activation body (§6).
 *
 * Deliberately EMPTY of trust-bearing fields: `requiredTermsVersion`,
 * `trainingRequired` and the training outcome are resolved server-side (from
 * admin policy and the shared training domain). A client cannot assert that it
 * is eligible (§47).
 */
export const activateEnablerBodySchema = Joi.object({}).unknown(false);

/**
 * Admin enforcement body (§52). The action set mirrors the lifecycle policy;
 * anything else is rejected before reaching the domain.
 */
export const enforcementBodySchema = Joi.object({
    action: Joi.string().valid('RESTRICT', 'SUSPEND', 'REACTIVATE', 'DEACTIVATE').required(),
    reason: Joi.string().trim().max(500).pattern(NON_BLANK_PATTERN).optional(),
}).unknown(false);

export const enforcementHistoryQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
}).unknown(false);
