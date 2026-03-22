import { Request, Response } from 'express';
import { UpdatePreferenceUseCase } from '../../application/use-cases/update-preference.use-case';
import { INotificationPreferenceRepository } from '../../domain/repositories';
import { NotificationMapper } from '../../application/mappers/notification-mapper';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { PreferenceNotFoundError } from '../../domain/errors/notification.errors';

export class PreferenceController {
  constructor(
    private updatePreferenceUseCase: UpdatePreferenceUseCase,
    private preferenceRepository: INotificationPreferenceRepository
  ) {}

  async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const preferences = await this.preferenceRepository.findByUserId(userId);
      res.status(200).json({
        success: true,
        data: preferences.map((p) => NotificationMapper.preferenceToResponseDto(p))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get preferences' }
      });
    }
  }

  async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestedChannel = (req.body as { channel?: string } | undefined)?.channel;
      const channel = requestedChannel;
      const { channel: _channel, ...dto } = req.body as { channel: string; [k: string]: any };
      if (!channel) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Channel is required' } });
        return;
      }
      const updated = await this.updatePreferenceUseCase.execute(userId, channel, dto);
      res.status(200).json({
        success: true,
        data: NotificationMapper.preferenceToResponseDto(updated),
        message: 'Preferences updated'
      });
    } catch (error) {
      if (error instanceof PreferenceNotFoundError) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update preferences' }
      });
    }
  }

  async optOut(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestedChannel = (req.body as { channel?: string } | undefined)?.channel;
      const channel = requestedChannel;
      if (!channel) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Channel is required' } });
        return;
      }
      const updated = await this.updatePreferenceUseCase.execute(userId, channel, { enabled: false });
      res.status(200).json({
        success: true,
        data: NotificationMapper.preferenceToResponseDto(updated),
        message: 'Opted out from channel'
      });
    } catch (error) {
      if (error instanceof PreferenceNotFoundError) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to opt out' }
      });
    }
  }
}
