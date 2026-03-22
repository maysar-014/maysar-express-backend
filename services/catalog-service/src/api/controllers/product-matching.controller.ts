// @ts-nocheck
import { Request, Response } from 'express';
import { MatchProductUseCase } from '../../application/use-cases/match-product.use-case';
import { ConfirmProductMatchUseCase } from '../../application/use-cases/confirm-product-match.use-case';
import { IProductMatchAuditRepository } from '../../domain/repositories/repository.interfaces';

export class ProductMatchingController {
    constructor(
        private readonly matchProductUseCase: MatchProductUseCase,
        private readonly confirmMatchUseCase: ConfirmProductMatchUseCase,
        private readonly auditRepository: IProductMatchAuditRepository
    ) { }

    /**
     * POST /api/catalog/products/match
     * Match a product against existing catalog
     */
    async matchProduct(req: Request, res: Response): Promise<void> {
        try {
            const user = (req as any).user;
            const sellerId =
                user?.userId ||
                user?.id ||
                (req.headers['x-user-id'] as string | undefined) ||
                req.body.sellerId;

            if (!sellerId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const result = await this.matchProductUseCase.execute({
                brand: req.body.brand,
                model: req.body.model,
                categoryId: req.body.categoryId,
                identifiers: req.body.identifiers,
                attributes: req.body.attributes,
                sellerId,
            });

            res.status(200).json(result);
        } catch (error) {
            res.status(200).json({
                matchFound: false,
                confidence: 0,
                candidates: [],
                reason: error instanceof Error ? error.message : 'Matching unavailable'
            });
        }
    }

    /**
     * POST /api/catalog/products/match/confirm/:confirmationId
     * Confirm or reject a product match
     */
    async confirmMatch(req: Request, res: Response): Promise<void> {
        try {
            const { confirmationId } = req.params;
            if (!confirmationId) {
                res.status(400).json({ error: 'Confirmation ID is required' });
                return;
            }
            const result = await this.confirmMatchUseCase.execute(confirmationId, {
                choice: req.body.choice,
                selectedProductId: req.body.selectedProductId,
            });

            res.status(200).json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (message.toLowerCase().includes('not found')) {
                res.status(404).json({ error: message });
                return;
            }
            if (
                message.toLowerCase().includes('not pending')
                || message.toLowerCase().includes('expired')
                || message.toLowerCase().includes('already')
            ) {
                res.status(409).json({ error: message });
                return;
            }
            if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('required')) {
                res.status(400).json({ error: message });
                return;
            }
            res.status(500).json({ error: message });
        }
    }

    /**
     * GET /api/catalog/products/match/pending
     * Get pending match confirmations for the current seller
     */
    async getPendingConfirmations(req: Request, res: Response): Promise<void> {
        try {
            const sellerId = (req as any).user?.userId || (req as any).user?.id;
            if (!sellerId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            // This would use the confirmation repository
            // For now, returning empty array
            res.status(200).json({ confirmations: [] });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    /**
     * GET /api/catalog/products/match/audit/:productId
     * Get match audit trail for a product
     */
    async getMatchAudit(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            const sellerId = (req as any).user?.userId || (req as any).user?.id;

            if (!sellerId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const audits = await this.auditRepository.findBySeller(sellerId, 10);
            res.status(200).json({ audits });
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
}
