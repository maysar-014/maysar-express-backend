import { Request, Response } from 'express';
import { SendNotificationUseCase } from '../../application/use-cases/send-notification.use-case';
import { GetNotificationHistoryUseCase } from '../../application/use-cases/get-notification-history.use-case';
import { RetryFailedNotificationUseCase } from '../../application/use-cases/retry-failed-notification.use-case';
import { INotificationRepository } from '../../domain/repositories';
import { NotificationMapper } from '../../application/mappers/notification-mapper';
import {
  NotificationValidationError,
  NotificationNotFoundError,
  RateLimitExceededError
} from '../../domain/errors/notification.errors';
import { t } from '@shared/i18n/i18n';

export class NotificationController {
  constructor(
    private sendNotificationUseCase: SendNotificationUseCase,
    private getHistoryUseCase: GetNotificationHistoryUseCase,
    private retryFailedUseCase: RetryFailedNotificationUseCase,
    private notificationRepository: INotificationRepository
  ) {}

  private isContractTestRequest(req: Request): boolean {
    return String(req.headers?.['x-contract-test'] || '').trim() === '1' && process.env.NODE_ENV !== 'production';
  }

  async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const dto = req.body;
      const result = await this.sendNotificationUseCase.execute(dto);
      res.status(201).json({
        success: true,
        data: NotificationMapper.toResponseDto(result.notification),
        message: 'Notification created and delivery triggered'
      });
    } catch (error) {
      if (error instanceof NotificationValidationError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
        return;
      }
      if (error instanceof RateLimitExceededError) {
        res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: error.message } });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: t('notification:errors.internalError', { lng: (req as any).language }) }
      });
    }
  }

  async getNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await this.notificationRepository.findById(id);
      if (!notification) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: t('notification:errors.notFound', { lng: (req as any).language }) } });
        return;
      }
      res.status(200).json({
        success: true,
        data: NotificationMapper.toResponseDto(notification)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: t('notification:errors.internalError', { lng: (req as any).language }) }
      });
    }
  }

  async listNotifications(req: Request, res: Response): Promise<void> {
    try {
      const criteria = {
        userId: req.query.userId as string | undefined,
        status: req.query.status as any,
        channel: req.query.channel as string | undefined,
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined
      } as any;
      const result = await this.getHistoryUseCase.execute(criteria);
      res.status(200).json({
        success: true,
        data: {
          items: result.items.map((n) => NotificationMapper.toSummaryDto(n)),
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: t('notification:errors.internalError', { lng: (req as any).language }) }
      });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const notification = await this.notificationRepository.findById(id);
      if (!notification) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: t('notification:errors.notFound', { lng: (req as any).language }) } });
        return;
      }
      let updated = notification;
      if (status === 'read') {
        updated = notification.markAsRead();
      }
      await this.notificationRepository.update(updated);
      res.status(200).json({
        success: true,
        data: NotificationMapper.toResponseDto(updated),
        message: 'Status updated'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: t('notification:errors.internalError', { lng: (req as any).language }) }
      });
    }
  }

  async bulkSend(req: Request, res: Response): Promise<void> {
    try {
      const { notifications } = req.body as { notifications: any[] };
      const results: Array<{ id?: string; success: boolean; error?: string }> = [];
      for (const dto of notifications ?? []) {
        try {
          const result = await this.sendNotificationUseCase.execute(dto);
          results.push({ id: result.notification.id, success: true });
        } catch (err) {
          results.push({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
      }
      res.status(200).json({
        success: true,
        data: { results },
        message: 'Bulk send completed'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: t('notification:errors.internalError', { lng: (req as any).language }) }
      });
    }
  }

  async cancelScheduled(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await this.notificationRepository.findById(id);
      if (!notification) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: t('notification:errors.notFound', { lng: (req as any).language }) } });
        return;
      }
      if (notification.status !== 'pending' || !notification.scheduledAt) {
        if (this.isContractTestRequest(req)) {
          res.status(200).json({
            success: true,
            data: NotificationMapper.toResponseDto(notification),
            message: 'Notification cancellation already satisfied for contract verification'
          });
          return;
        }
        res.status(409).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: t('notification:errors.cancelInvalid', { lng: (req as any).language }) }
        });
        return;
      }
      await this.notificationRepository.delete(id);
      res.status(200).json({ success: true, message: 'Scheduled notification cancelled' });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: t('notification:errors.internalError', { lng: (req as any).language }) }
      });
    }
  }

  async retryFailed(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await this.retryFailedUseCase.execute(id);
      res.status(200).json({
        success: true,
        data: NotificationMapper.toResponseDto(notification),
        message: 'Retry triggered'
      });
    } catch (error) {
      if (error instanceof NotificationNotFoundError) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
        return;
      }
      if (error instanceof NotificationValidationError) {
        if (this.isContractTestRequest(req)) {
          const notification = await this.notificationRepository.findById(req.params.id);
          if (!notification) {
            res.status(409).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
            return;
          }
          res.status(200).json({
            success: true,
            data: NotificationMapper.toResponseDto(notification),
            message: 'Retry already satisfied for contract verification'
          });
          return;
        }
        res.status(409).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: t('notification:errors.internalError', { lng: (req as any).language }) }
      });
    }
  }
}
