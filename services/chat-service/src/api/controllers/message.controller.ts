import type { Request, Response } from 'express';
import type { SendMessageUseCase } from '../../application/use-cases/send-message.use-case';
import type { ModerationUseCase } from '../../application/use-cases/moderation.use-case';
import type { MessageRepository } from '../../domain/repositories/message.repository.interface';
import type { ConversationRepository } from '../../domain/repositories/conversation.repository.interface';
import { sendSuccess, sendError } from '../../shared/response';
import { ChatError, chatAccessDenied, chatNotFound } from '../../shared/errors';

export class MessageController {
  constructor(
    private readonly sendUseCase: SendMessageUseCase,
    private readonly moderationUseCase: ModerationUseCase,
    private readonly messageRepo: MessageRepository,
    private readonly conversationRepo: ConversationRepository,
  ) {}

  send = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId as string;
      const message = await this.sendUseCase.execute({
        conversationId: req.params.id,
        senderId: userId,
        type: req.body.type,
        content: req.body.content ?? null,
        metadata: req.body.metadata ?? {},
      });
      sendSuccess(res, message, 201);
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId as string;
      const isMember = await this.conversationRepo.isParticipant(req.params.id, userId);
      if (!isMember) return sendError(res, chatAccessDenied());
      const limit = Number(req.query.limit) || 50;
      const cursor = req.query.cursor as string | undefined;
      const result = await this.messageRepo.findByConversation(req.params.id, { limit, cursor });
      sendSuccess(res, result);
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId as string;
      const message = await this.messageRepo.findById(req.params.messageId);
      if (!message) return sendError(res, chatNotFound('Message'));
      if (message.senderId !== userId) return sendError(res, chatAccessDenied());
      await this.messageRepo.softDelete(req.params.messageId);
      sendSuccess(res, { ok: true });
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };

  report = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId as string;
      const report = await this.moderationUseCase.reportMessage(
        userId,
        req.params.messageId,
        req.body.conversationId,
        req.body.reason,
      );
      sendSuccess(res, report, 201);
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };
}
