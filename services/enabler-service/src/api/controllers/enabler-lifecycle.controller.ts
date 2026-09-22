import { Request, Response } from 'express';
import { AcceptEnablerTermsUseCase } from '../../application/use-cases/accept-enabler-terms.use-case';
import { ActivateEnablerCapabilityUseCase } from '../../application/use-cases/activate-enabler-capability.use-case';
import { GetEnablerCapabilityStatusUseCase } from '../../application/use-cases/get-enabler-capability-status.use-case';
import { ApplyEnablerEnforcementUseCase } from '../../application/use-cases/apply-enabler-enforcement.use-case';
import { EnablerTrainingGateService } from '../../infrastructure/services/enabler-training-gate.service';

/**
 * HTTP surface for the Enabler capability lifecycle (§36, §53).
 *
 * Every handler resolves the enabler from the authenticated context — never
 * from a client-supplied `enablerId` — and delegates the rules to the domain.
 */
export class EnablerLifecycleController {
    constructor(
        private readonly acceptTermsUseCase: AcceptEnablerTermsUseCase,
        private readonly activateUseCase: ActivateEnablerCapabilityUseCase,
        private readonly capabilityStatusUseCase: GetEnablerCapabilityStatusUseCase,
        private readonly enforcementUseCase: ApplyEnablerEnforcementUseCase,
        private readonly enforcementRepository: {
            listForEnabler: (enablerId: string, limit?: number) => Promise<any[]>;
        },
        private readonly trainingGate: EnablerTrainingGateService,
        private readonly options: {
            /** Terms version an activation must have accepted. Overridable by env. */
            requiredTermsVersion?: string;
        } = {}
    ) { }

    private resolveEnablerId(req: Request): string | null {
        const context = (req as any).enablerContext;
        if (context?.enablerId) return context.enablerId;
        return req.params?.enablerId || null;
    }

    private resolveActorUserId(req: Request): string | undefined {
        const user = (req as any).user;
        const headerUserId = req.headers?.['x-user-id'];
        return (
            user?.userId ||
            user?.id ||
            (Array.isArray(headerUserId) ? headerUserId[0] : (headerUserId as string | undefined))
        );
    }

    private mapError(error: any): { status: number; message: string } {
        const message = error instanceof Error ? error.message : 'Operation failed';
        const lower = message.toLowerCase();
        if (lower.includes('not found')) return { status: 404, message };
        if (
            lower.includes('activation requirements') ||
            lower.includes('cannot be accepted') ||
            lower.includes('cannot apply') ||
            lower.includes('already deactivated')
        ) {
            return { status: 409, message };
        }
        if (lower.includes('required') || lower.includes('invalid')) {
            return { status: 422, message };
        }
        return { status: 400, message };
    }

    /** GET /enablers/:enablerId/capabilities — dashboard capability snapshot. */
    async getCapabilities(req: Request, res: Response): Promise<void> {
        try {
            const enablerId = this.resolveEnablerId(req);
            if (!enablerId) {
                res.status(400).json({ error: 'enablerId is required' });
                return;
            }
            const status = await this.capabilityStatusUseCase.execute(enablerId);
            res.status(200).json({ success: true, data: status });
        } catch (error: any) {
            const { status, message } = this.mapError(error);
            res.status(status).json({ error: message });
        }
    }

    /** POST /enablers/:enablerId/terms — record terms acceptance (§6). */
    async acceptTerms(req: Request, res: Response): Promise<void> {
        try {
            const enablerId = this.resolveEnablerId(req);
            if (!enablerId) {
                res.status(400).json({ error: 'enablerId is required' });
                return;
            }
            const result = await this.acceptTermsUseCase.execute(enablerId, {
                termsVersion: req.body?.termsVersion,
            });
            res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            const { status, message } = this.mapError(error);
            res.status(status).json({ error: message });
        }
    }

    /**
     * POST /enablers/:enablerId/activation (§6).
     *
     * The training outcome is fetched from the shared training domain here —
     * the request body carries no eligibility claims (§47).
     */
    async activate(req: Request, res: Response): Promise<void> {
        try {
            const enablerId = this.resolveEnablerId(req);
            if (!enablerId) {
                res.status(400).json({ error: 'enablerId is required' });
                return;
            }

            const userId = this.resolveActorUserId(req);
            const training = userId
                ? await this.trainingGate.evaluate(userId, 'enabler')
                : { trainingRequired: false, satisfied: false, mirroredStatus: 'not_started' as const };

            const result = await this.activateUseCase.execute(enablerId, {
                requiredTermsVersion: this.options.requiredTermsVersion,
                trainingRequired: training.trainingRequired,
                trainingStatus: training.mirroredStatus,
            });
            res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            const { status, message } = this.mapError(error);
            res.status(status).json({ error: message });
        }
    }

    /** POST /enablers/:enablerId/enforcement — admin restrict/suspend/reactivate/deactivate (§52). */
    async applyEnforcement(req: Request, res: Response): Promise<void> {
        try {
            const enablerId = this.resolveEnablerId(req);
            if (!enablerId) {
                res.status(400).json({ error: 'enablerId is required' });
                return;
            }
            const result = await this.enforcementUseCase.execute(
                enablerId,
                { action: req.body?.action, reason: req.body?.reason },
                this.resolveActorUserId(req)
            );
            res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            const { status, message } = this.mapError(error);
            res.status(status).json({ error: message });
        }
    }

    /** GET /enablers/:enablerId/enforcement-history — audit trail (§34, §52). */
    async getEnforcementHistory(req: Request, res: Response): Promise<void> {
        try {
            const enablerId = this.resolveEnablerId(req);
            if (!enablerId) {
                res.status(400).json({ error: 'enablerId is required' });
                return;
            }
            const limit = Number((req.query as any)?.limit ?? 50);
            const history = await this.enforcementRepository.listForEnabler(enablerId, limit);
            res.status(200).json({ success: true, data: history });
        } catch (error: any) {
            const { status, message } = this.mapError(error);
            res.status(status).json({ error: message });
        }
    }
}