import { Request, Response, NextFunction } from 'express';
import Joi, { Schema } from 'joi';

export const validateRequest = (schema: Schema) => (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body) as {
        error?: { details: Array<{ message: string }> };
        value: unknown;
    };

    if (error) return res.status(400).json({ error: error.details[0].message });
    req.body = value;
    next();
};

const checkoutPayloadSchema = Joi.object({
    cartId: Joi.string().required(),
    userId: Joi.string().required(),
    items: Joi.array().items(
        Joi.object({
            productId: Joi.string().required(),
            quantity: Joi.number().integer().positive().required(),
            price: Joi.number().min(0).required()
        })
    ).min(1).required()
});

export const validateCheckout = validateRequest(checkoutPayloadSchema);
