import Joi from 'joi';

export class WalletValidator {
    static creditWallet = Joi.object({
        userId: Joi.string().uuid().required(),
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
        userId: Joi.string().uuid().required(),
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
        userId: Joi.string().uuid().required(),
        amount: Joi.number().positive().required(),
        currency: Joi.string().length(3).uppercase().required(),
        reason: Joi.string().required(),
        expiresInSeconds: Joi.number().integer().positive().required(),
        idempotencyKey: Joi.string().required(),
        correlationId: Joi.string().uuid().required(),
        metadata: Joi.object().optional()
    });

    static releaseHold = Joi.object({
        userId: Joi.string().uuid().required(),
        holdId: Joi.string().uuid().required(),
        reason: Joi.string().optional(),
        correlationId: Joi.string().uuid().required(),
        idempotencyKey: Joi.string().required()
    });

    static captureHold = Joi.object({
        userId: Joi.string().uuid().required(),
        holdId: Joi.string().uuid().required(),
        amount: Joi.number().positive().optional(), // Optional: partial capture
        reason: Joi.string().optional(),
        correlationId: Joi.string().uuid().required(),
        idempotencyKey: Joi.string().required()
    });

    static reverseTransaction = Joi.object({
        userId: Joi.string().uuid().required(),
        transactionId: Joi.string().uuid().required(),
        reason: Joi.string().required(),
        correlationId: Joi.string().uuid().required(),
        idempotencyKey: Joi.string().required()
    });

    static getStatement = Joi.object({
        userId: Joi.string().uuid().required(),
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
    });

    static topUp = Joi.object({
        userId: Joi.string().uuid().required(),
        amount: Joi.number().positive().required(),
        currency: Joi.string().length(3).uppercase().required(),
        method: Joi.string().required(),
        customerEmail: Joi.string().email().optional(),
        customerName: Joi.string().optional(),
        phoneNumber: Joi.string().optional(),
        callbackUrl: Joi.string().uri().optional(),
        correlationId: Joi.string().uuid().required(),
        metadata: Joi.object().optional()
    });

    static initiatePayout = Joi.object({
        amount: Joi.number().positive().required(),
        currency: Joi.string().length(3).uppercase().required(),
        method: Joi.string().valid('BANK_TRANSFER', 'MOBILE_MONEY', 'WALLET').required(),
        bankDetails: Joi.object({
            bankName: Joi.string().required(),
            bankCode: Joi.string().required(),
            accountNumber: Joi.string().required(),
            accountName: Joi.string().required(),
            branchCode: Joi.string().optional()
        }).when('method', { is: 'BANK_TRANSFER', then: Joi.required() }),
        mobileMoneyDetails: Joi.object({
            provider: Joi.string().required(),
            phoneNumber: Joi.string().required(),
            accountName: Joi.string().required()
        }).when('method', { is: 'MOBILE_MONEY', then: Joi.required() }),
        idempotencyKey: Joi.string().required(),
        correlationId: Joi.string().uuid().required(),
        metadata: Joi.object().optional()
    });
}
