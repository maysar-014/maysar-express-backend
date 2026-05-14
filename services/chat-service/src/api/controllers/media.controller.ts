import type { Request, Response } from 'express';
import type { MediaUploadUseCase } from '../../application/use-cases/media-upload.use-case';
import { sendSuccess, sendError } from '../../shared/response';
import { ChatError, chatValidationError } from '../../shared/errors';

export class MediaController {
  constructor(private readonly mediaUploadUseCase: MediaUploadUseCase) {}

  upload = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId as string;
      const file = (req as any).file as { buffer: Buffer; mimetype: string } | undefined;
      if (!file) return sendError(res, chatValidationError('No file uploaded'));

      const mediaType = req.body.mediaType as string;

      if (mediaType === 'image') {
        const result = await this.mediaUploadUseCase.uploadImage(
          file.buffer,
          file.mimetype,
          userId,
        );
        return sendSuccess(res, result, 201);
      }

      if (mediaType === 'voice_note') {
        const durationSeconds = Number(req.body.durationSeconds);
        if (!durationSeconds || durationSeconds <= 0) {
          return sendError(res, chatValidationError('durationSeconds is required for voice notes'));
        }
        const result = await this.mediaUploadUseCase.uploadVoiceNote(
          file.buffer,
          file.mimetype,
          userId,
          durationSeconds,
        );
        return sendSuccess(res, result, 201);
      }

      sendError(res, chatValidationError('mediaType must be "image" or "voice_note"'));
    } catch (err) {
      if (err instanceof ChatError) return sendError(res, err);
      throw err;
    }
  };
}
