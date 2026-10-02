import { Request, Response } from 'express';
import { ProductMediaStore } from '../../infrastructure/media/product-media.store';

/**
 * A single multipart file as attached by multer.
 *
 * `@types/multer` is not a dependency of this repository and `multer@2` ships
 * no bundled declarations, so the shape consumed here is declared explicitly
 * instead of relying on an ambient Express augmentation that only some
 * compilation setups load.
 */
interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size?: number;
}

type MultipartRequest = Request & { file?: UploadedFile };

const mediaStore = new ProductMediaStore();

/**
 * POST /api/catalog/v1/media/upload
 *
 * Accepts a single image file via multipart/form-data (field name: "file").
 * Runs the buffer through the Sharp pipeline (resize → WebP → strip EXIF → thumbnail),
 * stores both assets in MinIO/S3, and returns their public URLs.
 *
 * Auth: seller, supplier, admin (enforced by route middleware)
 *
 * Response:
 *   { success: true, data: { mediaUrl: string, thumbnailUrl: string } }
 */
export async function uploadProductMedia(req: Request, res: Response): Promise<void> {
  try {
    const file = (req as MultipartRequest).file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded. Send a single file in the "file" field.' },
      });
      return;
    }

    const sellerId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req.query.sellerId as string) ||
      'unknown';

    const result = await mediaStore.uploadProductImage(
      file.buffer,
      file.mimetype,
      sellerId,
    );

    res.status(201).json({
      success: true,
      data: {
        mediaUrl: result.mediaUrl,
        thumbnailUrl: result.thumbnailUrl,
      },
    });
  } catch (err: any) {
    const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
    const code = err.code ?? 'MEDIA_UPLOAD_ERROR';
    res.status(status).json({
      success: false,
      error: { code, message: err.message ?? 'Media upload failed' },
    });
  }
}
