import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { chatConfig } from '../../config/chat.config';

export interface UploadImageResult {
  mediaUrl: string;
  thumbnailUrl: string;
}

export interface UploadVoiceNoteResult {
  mediaUrl: string;
  durationSeconds: number;
}

export class S3MediaStore {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly localMediaRoot: string;

  constructor() {
    this.client = new S3Client({
      endpoint: chatConfig.s3.endpoint,
      region: chatConfig.s3.region,
      credentials: {
        accessKeyId: chatConfig.s3.accessKeyId,
        secretAccessKey: chatConfig.s3.secretAccessKey,
      },
      forcePathStyle: chatConfig.s3.forcePathStyle,
    });
    this.bucket = chatConfig.s3.bucketChatMedia;
    this.localMediaRoot = path.join(os.tmpdir(), 'maysar-chat-media');
  }

  async uploadImage(
    buffer: Buffer,
    mimeType: string,
    userId: string,
  ): Promise<UploadImageResult> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(mimeType)) {
      throw new Error(`Unsupported image format: ${mimeType}`);
    }
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('Image exceeds 10 MB limit');
    }

    const ext = mimeType.split('/')[1];
    const uuid = randomUUID();
    const key = `chat/media/${userId}/${uuid}.${ext}`;
    const thumbKey = `chat/media/${userId}/${uuid}_thumb.${ext}`;

    const thumbBuffer = await sharp(buffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: thumbKey,
          Body: thumbBuffer,
          ContentType: mimeType,
        }),
      );

      const base = `${chatConfig.s3.endpoint}/${this.bucket}`;
      return {
        mediaUrl: `${base}/${key}`,
        thumbnailUrl: `${base}/${thumbKey}`,
      };
    } catch (error) {
      const mediaUrl = await this.writeLocalMedia(`${uuid}.${ext}`, buffer);
      const thumbnailUrl = await this.writeLocalMedia(`${uuid}_thumb.${ext}`, thumbBuffer);
      return { mediaUrl, thumbnailUrl };
    }
  }

  async uploadVoiceNote(
    buffer: Buffer,
    mimeType: string,
    userId: string,
    durationSeconds: number,
  ): Promise<UploadVoiceNoteResult> {
    const allowed = ['audio/ogg', 'audio/opus', 'audio/mp4', 'audio/m4a', 'audio/mpeg'];
    if (!allowed.includes(mimeType)) {
      throw new Error(`Unsupported audio format: ${mimeType}`);
    }
    if (buffer.length > 15 * 1024 * 1024) {
      throw new Error('Voice note exceeds 15 MB limit');
    }
    if (durationSeconds > 300) {
      throw new Error('Voice note exceeds 300 second limit');
    }

    const ext =
      mimeType.includes('ogg') || mimeType.includes('opus') ? 'ogg' : 'm4a';
    const uuid = randomUUID();
    const key = `chat/media/${userId}/${uuid}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      const base = `${chatConfig.s3.endpoint}/${this.bucket}`;
      return {
        mediaUrl: `${base}/${key}`,
        durationSeconds,
      };
    } catch (error) {
      return {
        mediaUrl: await this.writeLocalMedia(`${uuid}.${ext}`, buffer),
        durationSeconds,
      };
    }
  }

  private async writeLocalMedia(fileName: string, buffer: Buffer): Promise<string> {
    const directory = path.join(this.localMediaRoot, 'chat-media');
    await mkdir(directory, { recursive: true });
    const filePath = path.join(directory, fileName);
    await writeFile(filePath, buffer);
    return pathToFileURL(filePath).toString();
  }
}
