import { Request, Response } from 'express';
import { IPushTokenRepository } from '../../domain/repositories';

const ALLOWED_PLATFORMS = new Set(['web', 'android', 'ios', 'unknown']);

export class PushTokenController {
  constructor(private pushTokenRepository: IPushTokenRepository) {}

  async register(req: Request, res: Response): Promise<void> {
    const body = req.body ?? {};
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const platform = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : undefined;
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : undefined;
    const userIdHeader = (req as any).userId as string | undefined;
    const userIdBody = typeof body.userId === 'string' ? body.userId.trim() : undefined;

    const userId = userIdHeader || userIdBody;
    if (!userId || userId === 'anonymous') {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User ID is required' } });
      return;
    }
    if (userIdBody && userIdHeader && userIdBody !== userIdHeader) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'User ID mismatch' } });
      return;
    }
    if (!token) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Token is required' } });
      return;
    }
    if (platform && !ALLOWED_PLATFORMS.has(platform)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid platform' } });
      return;
    }

    const record = await this.pushTokenRepository.upsertToken({
      userId,
      token,
      platform,
      deviceId
    });

    res.status(201).json({
      success: true,
      data: {
        id: record.id,
        userId: record.userId,
        token: record.token,
        platform: record.platform,
        deviceId: record.deviceId,
        isActive: record.isActive,
        lastSeenAt: record.lastSeenAt
      }
    });
  }

  async unregister(req: Request, res: Response): Promise<void> {
    const tokenParam = typeof req.params.token === 'string' ? req.params.token.trim() : '';
    const userId = (req as any).userId as string | undefined;

    if (!userId || userId === 'anonymous') {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User ID is required' } });
      return;
    }
    if (!tokenParam) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Token is required' } });
      return;
    }

    const deactivated = await this.pushTokenRepository.deactivateToken(userId, tokenParam);
    if (!deactivated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Token not found' } });
      return;
    }

    res.status(200).json({ success: true, message: 'Token deactivated' });
  }
}
