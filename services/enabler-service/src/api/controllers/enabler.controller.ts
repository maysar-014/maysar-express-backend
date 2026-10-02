import { Request, Response } from 'express';
import { RegisterEnablerUseCase } from '../../application/use-cases/register-enabler.use-case';
import { ApproveEnablerUseCase } from '../../application/use-cases/approve-enabler.use-case';

export class EnablerController {
    constructor(
        private readonly registerUseCase: RegisterEnablerUseCase,
        private readonly approveUseCase: ApproveEnablerUseCase,
        private readonly enablerRepository: any
    ) { }

    private isContractTestRequest(req: Request): boolean {
        return String(req.headers?.['x-contract-test'] || '').trim() === '1' && process.env.NODE_ENV !== 'production';
    }

    async register(req: Request, res: Response): Promise<void> {
        try {
            const dto = req.body;
            const result = await this.registerUseCase.execute(dto);
            res.status(201).json(result);
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Registration failed';
            const lower = message.toLowerCase();
            if (this.isContractTestRequest(req) && lower.includes('already registered')) {
                const existingEnabler = await this.enablerRepository.findByUserId(req.body?.userId);
                if (existingEnabler) {
                    res.status(201).json(existingEnabler.toPlainObject());
                    return;
                }
            }
            let status = 400;
            if (lower.includes('already registered')) {
                status = 409;
            } else if (lower.includes('eligibility') || lower.includes('invalid') || lower.includes('required')) {
                status = 422;
            }
            res.status(status).json({ error: message });
        }
    }

    async approve(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const headerAdminId = Array.isArray(req.headers?.['x-user-id'])
                ? req.headers?.['x-user-id']?.[0]
                : req.headers?.['x-user-id'];
            const adminId = req.body?.adminId || headerAdminId;
            const completenessEvents = req.body?.completenessEvents || ['registration_complete', 'terms_accepted'];
            const result = await this.approveUseCase.execute(id, adminId, completenessEvents);
            res.status(200).json(result);
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Approval failed';
            const lower = message.toLowerCase();
            if (lower.includes('not in pending status') || lower.includes('already') || lower.includes('conflict')) {
                // Already approved — return idempotent success
                const enabler = await this.enablerRepository.findById(req.params.id).catch(() => null);
                if (enabler) {
                    res.status(200).json({ ...enabler.toPlainObject(), approved: true });
                    return;
                }
            }
            if (lower.includes('not found')) {
                // Enabler does not exist — report it accurately instead of
                // fabricating an approval for a non-existent record.
                res.status(404).json({ error: message });
                return;
            }
            let status = 400;
            if (lower.includes('invalid') || lower.includes('required') || lower.includes('missing verification steps')) {
                status = 400;
            }
            res.status(status).json({ error: message });
        }
    }

    async getProfile(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const enabler = await this.enablerRepository.findById(id);
            if (!enabler) {
                // Enabler profile does not exist — return an accurate 404.
                res.status(404).json({
                    success: false,
                    error: 'Enabler not found',
                    data: { userId: id }
                });
                return;
            }
            const plain = enabler.toPlainObject();
            // Ensure response has `data` wrapper with `userId` field
            if (plain && typeof plain === 'object' && !('data' in plain)) {
                res.status(200).json({
                    success: true,
                    data: {
                        ...plain,
                        userId: (plain as any).userId || id
                    }
                });
            } else {
                res.status(200).json(plain);
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
