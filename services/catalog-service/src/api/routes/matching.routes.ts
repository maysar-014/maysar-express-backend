import { Router } from 'express';
import { ProductMatchingController } from '../controllers/product-matching.controller';
import { requireAuth } from '@shared/middleware/auth-context.middleware';

export class MatchingRoutes {
    private router: Router;

    constructor(private readonly controller: ProductMatchingController) {
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // Match product endpoint
        this.router.post('/match', requireAuth, this.controller.matchProduct.bind(this.controller));

        // Confirm match endpoint
        this.router.post('/match/confirm/:confirmationId', requireAuth, this.controller.confirmMatch.bind(this.controller));

        // Get pending confirmations
        this.router.get('/match/pending', requireAuth, this.controller.getPendingConfirmations.bind(this.controller));

        // Get match audit trail
        this.router.get('/match/audit/:productId', requireAuth, this.controller.getMatchAudit.bind(this.controller));
    }

    getRouter(): Router {
        return this.router;
    }
}
