import type { S3MediaStore, UploadImageResult, UploadVoiceNoteResult } from '../../infrastructure/media/s3-media.store';
import { chatValidationError } from '../../shared/errors';

export class MediaUploadUseCase {
  constructor(private readonly mediaStore: S3MediaStore) {}

  async uploadImage(
    buffer: Buffer,
    mimeType: string,
    userId: string,
  ): Promise<UploadImageResult> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(mimeType)) {
      throw chatValidationError(`Unsupported image format. Allowed: ${allowed.join(', ')}`);
    }
    if (buffer.length > 10 * 1024 * 1024) {
      throw chatValidationError('Image must be ≤ 10 MB');
    }
    return this.mediaStore.uploadImage(buffer, mimeType, userId);
  }

  async uploadVoiceNote(
    buffer: Buffer,
    mimeType: string,
    userId: string,
    durationSeconds: number,
  ): Promise<UploadVoiceNoteResult> {
    const allowed = ['audio/ogg', 'audio/opus', 'audio/mp4', 'audio/m4a', 'audio/mpeg'];
    if (!allowed.includes(mimeType)) {
      throw chatValidationError(`Unsupported audio format. Allowed: ${allowed.join(', ')}`);
    }
    if (buffer.length > 15 * 1024 * 1024) {
      throw chatValidationError('Voice note must be ≤ 15 MB');
    }
    if (durationSeconds > 300) {
      throw chatValidationError('Voice note must be ≤ 300 seconds');
    }
    return this.mediaStore.uploadVoiceNote(buffer, mimeType, userId, durationSeconds);
  }
}
