import { Request, Response } from 'express';
import QRCode from 'qrcode';

export interface SellerStorefrontResponse {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  shareUrl: string;
  shortUrl: string;
  qrCode?: string;
  stats: {
    totalProducts: number;
    rating: number;
  };
}

export interface ShareUrlResponse {
  shareUrl: string;
  shortUrl: string;
  qrCode?: string;
  expiresAt?: string;
}

export class SellerStorefrontController {
  private readonly baseUrl: string;

  constructor(baseUrl: string = process.env.BASE_URL || 'https://maysar.co.tz') {
    this.baseUrl = baseUrl;
  }

  async getStorefront(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Seller ID is required' }
        });
        return;
      }

      const seller = await this.getSellerDetails(sellerId);

      if (!seller) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Seller not found' }
        });
        return;
      }

      const shareUrl = `${this.baseUrl}/seller/${sellerId}`;
      const shortUrl = `${this.baseUrl}/s/${sellerId}`;
      const qrCode = await this.generateQRCode(shareUrl);

      const response: SellerStorefrontResponse = {
        id: seller.id,
        name: seller.name,
        description: seller.description,
        logo: seller.logo,
        shareUrl,
        shortUrl,
        qrCode,
        stats: {
          totalProducts: seller.totalProducts || 0,
          rating: seller.rating || 0
        }
      };

      res.status(200).json({
        success: true,
        data: response,
        meta: { timestamp: new Date() }
      });
    } catch (error) {
      console.error('SellerStorefrontController.getStorefront error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch storefront' }
      });
    }
  }

  async generateShareUrl(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { includeQR = true, customSlug } = req.body;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Seller ID is required' }
        });
        return;
      }

      const seller = await this.getSellerDetails(sellerId);

      const slug = customSlug || sellerId;
      const shareUrl = `${this.baseUrl}/seller/${slug}`;
      const shortUrl = `${this.baseUrl}/s/${slug}`;

      const response: ShareUrlResponse = {
        shareUrl,
        shortUrl
      };

      if (includeQR) {
        response.qrCode = await this.generateQRCode(shareUrl);
      }

      res.status(200).json({
        success: true,
        data: response,
        meta: { timestamp: new Date() }
      });
    } catch (error) {
      console.error('SellerStorefrontController.generateShareUrl error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate share URL' }
      });
    }
  }

  private async generateQRCode(url: string): Promise<string> {
    try {
      return await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 1
      });
    } catch (error) {
      console.error('QR Code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  private async getSellerDetails(sellerId: string): Promise<any> {
    return {
      id: sellerId,
      name: `Seller ${sellerId}`,
      description: 'Seller storefront',
      logo: null,
      totalProducts: 0,
      rating: 0
    };
  }

  private sendNotImplemented(res: Response, message: string): void {
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message }
    });
  }
}
