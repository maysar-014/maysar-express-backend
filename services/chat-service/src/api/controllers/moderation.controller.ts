import type { Request, Response } from 'express';
import type { ModerationUseCase } from '../../application/use-cases/moderation.use-case';
import { sendSuccess, sendError } from '../../shared/response';
import { ChatError } from '../../shared/errors';

export class ModerationController {
  constructor(private readonly moderationUseCase: ModerationUseCase) {}

  blockUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const blockerId = (req as any).user.userId as string;
      await this.moderationUseCase.blockUser(blockerId, req.params.userId);
      sendSuccess(res, { ok: true });
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };

  unblockUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const blockerId = (req as any).user.userId as string;
      await this.moderationUseCase.unblockUser(blockerId, req.params.userId);
      sendSuccess(res, { ok: true });
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };
}
