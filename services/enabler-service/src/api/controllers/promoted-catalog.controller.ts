import { Request, Response } from 'express';
import { PromotedCatalogService } from '../../application/services/promoted-catalog.service';

export class PromotedCatalogController {
  constructor(private readonly service = new PromotedCatalogService()) {}

  private sendError(res: Response, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Unable to resolve enabler catalog';
    const normalized = message.toLowerCase();
    const status = normalized.includes('not found') ? 404
      : normalized.includes('not currently approved') ? 403
      : normalized.includes('unavailable') || normalized.includes('inactive') ? 409
      : 500;
    res.status(status).json({ success: false, error: status === 404 ? 'NOT_FOUND' : status === 403 ? 'NOT_AUTHORIZED' : 'CATALOG_ERROR', message });
  }

  async getCatalogLink(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.getOrCreateCatalogLink(req.params.enablerId);
      res.status(200).json({ success: true, data: result });
    } catch (error) { this.sendError(res, error); }
  }

  async getMyCatalog(req: Request, res: Response): Promise<void> {
    try {
      const products = await this.service.getAuthorizedProducts(req.params.enablerId);
      res.status(200).json({ success: true, data: { products, count: products.length } });
    } catch (error) { this.sendError(res, error); }
  }

  async getProductShareLink(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.getProductShareLink(req.params.enablerId, req.params.productId);
      res.status(200).json({ success: true, data: result });
    } catch (error) { this.sendError(res, error); }
  }

  async getPublicCatalog(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.getPublicCatalog(req.params.publicCode);
      res.status(200).json({ success: true, data: result });
    } catch (error) { this.sendError(res, error); }
  }
}
