import { Request, Response } from 'express';
import { SellerPromotionProgramService } from '../../application/services/seller-promotion-program.service';

export class SellerPromotionProgramController {
  constructor(private readonly service = new SellerPromotionProgramService()) {}

  private actor(req: Request) {
    const user = (req as any).user;
    const roles = [...(Array.isArray(user?.roles) ? user.roles : []), ...(user?.role ? [user.role] : [])];
    return { userId: String(user?.userId ?? user?.id ?? ''), roles: roles.map((role: unknown) => String(role).toLowerCase()) };
  }

  private sellerAccess(req: Request, res: Response): string | null {
    const { userId, roles } = this.actor(req);
    const sellerId = req.params.sellerId;
    if (!userId || (userId !== sellerId && !roles.includes('admin'))) {
      res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Only this seller may manage its promotion program' });
      return null;
    }
    return userId;
  }

  private handleError(res: Response, error: unknown) {
    const message = error instanceof Error ? error.message : 'Promotion program request failed';
    const normalized = message.toLowerCase();
    const status = normalized.includes('not found') ? 404
      : normalized.includes('not active') || normalized.includes('owned by this seller') || normalized.includes('only this seller') ? 403
      : normalized.includes('must') || normalized.includes('required') || normalized.includes('invalid') || normalized.includes('already exists') || normalized.includes('spots') || normalized.includes('closed') || normalized.includes('application') ? 409
      : 500;
    res.status(status).json({ success: false, error: status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : status === 409 ? 'PROMOTION_CONFLICT' : 'PROMOTION_ERROR', message });
  }

  async saveOffer(req: Request, res: Response): Promise<void> {
    const actor = this.sellerAccess(req, res);
    if (!actor) return;
    try {
      const result = await this.service.saveOffer(req.params.sellerId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) { this.handleError(res, error); }
  }

  async closeOffer(req: Request, res: Response): Promise<void> {
    if (!this.sellerAccess(req, res)) return;
    try {
      const result = await this.service.closeOffer(req.params.sellerId);
      res.status(200).json({ success: true, data: result });
    } catch (error) { this.handleError(res, error); }
  }

  async getSellerProgram(req: Request, res: Response): Promise<void> {
    if (!this.sellerAccess(req, res)) return;
    try {
      const result = await this.service.getSellerProgram(req.params.sellerId);
      res.status(200).json({ success: true, data: result });
    } catch (error) { this.handleError(res, error); }
  }

  async browseOffers(req: Request, res: Response): Promise<void> {
    try {
      const enablerId = (req as any).enablerContext?.enablerId;
      if (!enablerId) {
        res.status(403).json({ success: false, error: 'ENABLER_CONTEXT_REQUIRED' });
        return;
      }
      const result = await this.service.browseOffers(enablerId);
      res.status(200).json({ success: true, data: result });
    } catch (error) { this.handleError(res, error); }
  }

  async apply(req: Request, res: Response): Promise<void> {
    try {
      const enablerId = (req as any).enablerContext?.enablerId;
      if (!enablerId) {
        res.status(403).json({ success: false, error: 'ENABLER_CONTEXT_REQUIRED' });
        return;
      }
      const result = await this.service.apply(enablerId, req.params.offerId);
      res.status(201).json({ success: true, data: result });
    } catch (error) { this.handleError(res, error); }
  }

  async decideApplication(req: Request, res: Response): Promise<void> {
    const actor = this.sellerAccess(req, res);
    if (!actor) return;
    try {
      const result = await this.service.decideApplication(req.params.sellerId, req.params.applicationId, req.body.decision, actor);
      res.status(200).json({ success: true, data: result });
    } catch (error) { this.handleError(res, error); }
  }
}
