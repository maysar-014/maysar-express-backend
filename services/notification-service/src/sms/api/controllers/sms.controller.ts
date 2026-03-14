import { Request, Response, NextFunction } from 'express';
import { inject } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import { TYPES } from '../../infrastructure/types';
import { SendSmsUseCase } from '../../application/use-cases/send-sms.use-case';
import { TrackDeliveryUseCase } from '../../application/use-cases/track-delivery.use-case';
import { RetryFailedMessagesUseCase } from '../../application/use-cases/retry-failed-messages.use-case';
import { GetStatisticsUseCase } from '../../application/use-cases/get-statistics.use-case';
import { SendSmsDto, SendSmsDtoSchema } from '../../application/dto/sms.dto';
import Joi from 'joi';

@controller('/sms')
export class SmsController {
    constructor(
        @inject(TYPES.SendSmsUseCase) private sendSmsUseCase: SendSmsUseCase,
        @inject(TYPES.TrackDeliveryUseCase) private trackDeliveryUseCase: TrackDeliveryUseCase,
        @inject(TYPES.RetryFailedMessagesUseCase) private retryFailedMessagesUseCase: RetryFailedMessagesUseCase,
        @inject(TYPES.GetStatisticsUseCase) private getStatisticsUseCase: GetStatisticsUseCase
    ) { }

    @httpPost('/send')
    async send(req: Request, res: Response, next: NextFunction) {
        try {
            const dto: SendSmsDto = req.body;

            // Validate with Joi
            const schema = Joi.object({
                phoneNumber: Joi.string().pattern(/^\+[1-9]\d{7,14}$/).required(),
                message: Joi.string().min(1).max(1530).required(),
                userId: Joi.string().optional(),
                scheduledAt: Joi.date().iso().optional(),
                metadata: Joi.object().optional()
            });

            const { error } = schema.validate(dto);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: error.details[0].message
                    }
                });
            }

            const result = await this.sendSmsUseCase.execute(dto);

            if (result.success) {
                return res.status(201).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            next(error);
        }
    }

    @httpGet('/status/:messageId')
    async getStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params;
            const status = await this.trackDeliveryUseCase.execute(messageId);
            return res.json(status);
        } catch (error) {
            next(error);
        }
    }

    @httpPost('/retry/failed')
    async retryFailed(req: Request, res: Response, next: NextFunction) {
        try {
            const options = {
                maxRetries: req.body.maxRetries ? parseInt(req.body.maxRetries) : undefined,
                limit: req.body.limit ? parseInt(req.body.limit) : undefined
            };

            const result = await this.retryFailedMessagesUseCase.execute(options);
            return res.json(result);
        } catch (error) {
            next(error);
        }
    }

    @httpPost('/retry/:messageId')
    async retryMessage(req: Request, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params;
            const result = await this.retryFailedMessagesUseCase.executeById(messageId);

            if (result.success) {
                return res.json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            next(error);
        }
    }

    @httpGet('/statistics')
    async getStatistics(req: Request, res: Response, next: NextFunction) {
        try {
            // Default to today
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const startTime = req.query.startTime ? new Date(req.query.startTime as string) : startOfDay;
            const endTime = req.query.endTime ? new Date(req.query.endTime as string) : new Date();

            const stats = await this.getStatisticsUseCase.execute(startTime, endTime);
            return res.json(stats);
        } catch (error) {
            next(error);
        }
    }

    @httpPost('/webhook/africastalking')
    async webhookAfricastalking(req: Request, res: Response, next: NextFunction) {
        // This would handle delivery reports from Africa's Talking
        // Implementation would go here, parsing the body and updating message status
        // via a new Use Case or method on TrackDeliveryUseCase

        // For now, just acknowledge receipt
        return res.status(200).send('OK');
    }
}
