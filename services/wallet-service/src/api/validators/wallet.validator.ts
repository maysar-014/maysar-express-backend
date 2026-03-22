import Joi from 'joi';
import { joiId } from '@shared/validation/id';

const SAFE_VISIBLE_STRING_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F-\u009F]+$/u;
const EXAMPLE_DOT_COM_EMAIL_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{1,63}@example\.com$/;
const TANZANIA_MOBILE_PATTERN = /^\+255[67]\d{8}$/;
const safeVisibleString = Joi.string().min(1).pattern(SAFE_VISIBLE_STRING_PATTERN);
const MOBILE_MONEY_METHODS = ['MOBILE_MONEY', 'MPESA', 'AIRTEL_MONEY', 'TIGO_PESA', 'HALOPESA'] as const;

export class WalletValidator {
    static walletUserParams = Joi.object({
        userId: joiId().required()
    });

    static creditWallet = Joi.object({
        userId: joiId().required(),
        amount: Joi.number().positive().required(),
        currency: Joi.string().length(3).uppercase().required(),
        description: Joi.string().optional(),
        referenceType: Joi.string().optional(),
        referenceId: Joi.string().optional(),
        idempotencyKey: Joi.string().required(),
        correlationId: Joi.string().uuid().required(),
        metadata: Joi.object().optional()
    });

    static debitWallet = Joi.object({
        userId: joiId().required(),
        amount: Joi.number().positive().required(),
        currency: Joi.string().length(3).uppercase().required(),
        description: Joi.string().optional(),
        reason: Joi.string().required(),
        referenceType: Joi.string().optional(),
        referenceId: Joi.string().optional(),
        idempotencyKey: Joi.string().required(),
        correlationId: Joi.string().uuid().required(),
        metadata: Joi.object().optional()
    });

    static placeHold = Joi.object({
        userId: joiId().required(),
        amount: Joi.number().positive().required(),
        currency: Joi.string().valid('TZS').required(),
        reason: safeVisibleString.required(),
        expiresInSeconds: Joi.number().integer().positive().required(),
        idempotencyKey: safeVisibleString.required(),
        correlationId: Joi.string().uuid().required(),
        metadata: Joi.object().optional()
    });

    static releaseHold = Joi.object({
        userId: joiId().required(),
        holdId: joiId().required(),
        reason: safeVisibleString.optional(),
        correlationId: Joi.string().uuid().required(),
        idempotencyKey: safeVisibleString.required()
    });

    static captureHold = Joi.object({
        userId: joiId().required(),
        holdId: joiId().required(),
        amount: Joi.number().positive().optional(), // Optional: partial capture
        reason: safeVisibleString.optional(),
        correlationId: Joi.string().uuid().required(),
        idempotencyKey: safeVisibleString.required()
    });

    static reverseTransaction = Joi.object({
        userId: joiId().required(),
        transactionId: joiId().required(),
        reason: safeVisibleString.required(),
        correlationId: Joi.string().uuid().required(),
        idempotencyKey: safeVisibleString.required()
    });

    static statementQuery = Joi.object({
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
    });

    static getStatement = WalletValidator.statementQuery;

    static topUp = Joi.object({
        userId: joiId().required(),
        amount: Joi.number().positive().required(),
        currency: Joi.string().valid('TZS').required(),
        method: Joi.string().valid('MOBILE_MONEY', 'MPESA', 'AIRTEL_MONEY', 'TIGO_PESA', 'HALOPESA', 'WALLET', 'CARD', 'BANK_TRANSFER').required(),
        customerEmail: Joi.string().email().min(14).max(76).pattern(EXAMPLE_DOT_COM_EMAIL_PATTERN).optional(),
        customerName: safeVisibleString.optional(),
        phoneNumber: Joi.string().trim().pattern(TANZANIA_MOBILE_PATTERN).when('method', {
            is: Joi.string().valid(...MOBILE_MONEY_METHODS),
            then: Joi.required()
        }),
        callbackUrl: Joi.string().uri().optional(),
        correlationId: Joi.string().uuid().required(),
        metadata: Joi.object().optional()
    });

    static initiatePayout = Joi.object({
        amount: Joi.number().min(10000).required(),
        currency: Joi.string().valid('TZS').required(),
        method: Joi.string().valid('BANK_TRANSFER', 'MOBILE_MONEY', 'WALLET').required(),
        bankDetails: Joi.object({
            bankName: safeVisibleString.required(),
            bankCode: safeVisibleString.required(),
            accountNumber: safeVisibleString.required(),
            accountName: safeVisibleString.required(),
            branchCode: safeVisibleString.optional()
        }).when('method', { is: 'BANK_TRANSFER', then: Joi.required() }),
        mobileMoneyDetails: Joi.object({
            provider: safeVisibleString.required(),
            phoneNumber: Joi.string().trim().pattern(TANZANIA_MOBILE_PATTERN).required(),
            accountName: safeVisibleString.required()
        }).when('method', { is: 'MOBILE_MONEY', then: Joi.required() }),
        idempotencyKey: safeVisibleString.required(),
        correlationId: Joi.string().uuid().required(),
        metadata: Joi.object().optional()
    });

    static freezeFunds = Joi.object({
        userId: joiId().required(),
        amount: Joi.number().integer().min(1).required(),
        description: safeVisibleString.required(),
        reason: safeVisibleString.optional(),
        idempotencyKey: safeVisibleString.required(),
        correlationId: Joi.string().uuid().optional()
    });

    static unfreezeFunds = Joi.object({
        userId: joiId().required(),
        amount: Joi.number().integer().min(1).required(),
        description: safeVisibleString.required(),
        reason: safeVisibleString.optional(),
        idempotencyKey: safeVisibleString.required(),
        correlationId: Joi.string().uuid().optional()
    });
}
