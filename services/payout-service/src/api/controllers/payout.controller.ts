import { Request, Response } from 'express';
import { InitiatePayoutUseCase } from '../../application/use-cases/initiate-payout.use-case';
import { CompletePayoutUseCase } from '../../application/use-cases/complete-payout.use-case';
import { CancelPayoutUseCase } from '../../application/use-cases/cancel-payout.use-case';

const ELIGIBLE_PAYOUT_ROLES = new Set(['seller', 'supplier', 'courier', 'enabler', 'system']);

/** Documented payout masking rule: only the last 3 digits of a phone stay visible. */
const PAYOUT_PHONE_VISIBLE_DIGITS = 3;

export function maskPayoutPhoneNumber(phoneNumber: string): string {
    const digits = String(phoneNumber ?? '').replace(/\D/g, '');
    if (!digits) return '';
    const visible = digits.slice(-PAYOUT_PHONE_VISIBLE_DIGITS);
    return `${'*'.repeat(digits.length - visible.length)}${visible}`;
}

function toIsoString(value?: Date | string | null): string | null {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Payout reads are backed by the `Payout` aggregate, which keeps its data in a
 * private `props` bag. Returning the aggregate straight to Express serialises
 * that bag (`{ props: { id: ... } }`), so clients received the internal `id`
 * instead of the documented `payoutId`, plus non-JSON `Date` instances.
 * Unwrap the aggregate before mapping it into the documented response shape.
 */
function unwrapPayoutRecord(payout: any): any {
    if (!payout || typeof payout !== 'object') return {};
    if (typeof payout.toObject === 'function') {
        return payout.toObject() ?? {};
    }
    if (payout.props && typeof payout.props === 'object') {
        return payout.props;
    }
    return payout;
}

/**
 * Flat, JSON-safe payout summary matching `PayoutSummary` in
 * `shared-contracts/payout-service-contracts.ts`. Account/payment details are
 * intentionally omitted so read endpoints cannot leak PII.
 */
function buildPayoutSummary(source: any) {
    const amount = Number(source.amount ?? 0);
    const fee = Number(source.fee ?? 0);
    const netAmount = Number(source.netAmount ?? amount - fee);

    return {
        payoutId: source.id ?? source.payoutId ?? null,
        userId: source.userId,
        userRole: source.userRole,
        amount,
        currency: source.currency,
        fee,
        netAmount: Number.isFinite(netAmount) ? Number(netAmount.toFixed(2)) : 0,
        method: source.method,
        status: source.status,
        reference: source.reference ?? null,
        failureReason: source.failureReason ?? null,
        createdAt: toIsoString(source.createdAt),
        updatedAt: toIsoString(source.updatedAt),
        processedAt: toIsoString(source.processedAt),
        completedAt: toIsoString(source.completedAt),
        failedAt: toIsoString(source.failedAt)
    };
}

function toPayoutSummary(payout: any) {
    return buildPayoutSummary(unwrapPayoutRecord(payout));
}

function toPayoutSummaries(payouts: any): any[] {
    return Array.isArray(payouts) ? payouts.map((payout) => toPayoutSummary(payout)) : [];
}

/** Detail view documented as `{ payoutId, status, amount, method, phoneNumber (masked), createdAt, completedAt? }`. */
function toPayoutDetail(payout: any) {
    const source = unwrapPayoutRecord(payout);
    const phoneNumber = source.mobileMoneyDetails?.phoneNumber;

    return {
        ...buildPayoutSummary(source),
        ...(phoneNumber ? { phoneNumber: maskPayoutPhoneNumber(phoneNumber) } : {})
    };
}

export class PayoutController {
    constructor(
        private readonly initiatePayoutUseCase: InitiatePayoutUseCase,
        private readonly completePayoutUseCase: CompletePayoutUseCase,
        private readonly cancelPayoutUseCase: CancelPayoutUseCase,
        private readonly payoutRepository: any
    ) { }

    private resolveUserRole(user: any): string | undefined {
        if (!user) return undefined;

        if (typeof user.role === 'string' && user.role.trim().length) {
            const normalizedRole = user.role.trim().toLowerCase();
            if (ELIGIBLE_PAYOUT_ROLES.has(normalizedRole)) {
                return normalizedRole;
            }
        }

        if (Array.isArray(user.roles) && user.roles.length) {
            const eligibleRole = user.roles
                .map((role: unknown) => String(role).trim().toLowerCase())
                .find((role: string) => ELIGIBLE_PAYOUT_ROLES.has(role));
            if (eligibleRole) {
                return eligibleRole;
            }
        }

        return undefined;
    }

    async initiate(req: Request, res: Response): Promise<void> {
        try {
            const user = (req as any).user;
            const userRole = this.resolveUserRole(user);

            const result = await this.initiatePayoutUseCase.execute({
                ...req.body,
                userId: user?.userId,
                userRole,
                availableBalance: req.body.availableBalance,
                userStatus: req.body.userStatus,
                lastPayoutDate: req.body.lastPayoutDate ? new Date(req.body.lastPayoutDate) : undefined
            });
            res.status(result.success ? 201 : 400).json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Internal server error';
            const lower = message.toLowerCase();
            if (
                lower.includes('invalid') ||
                lower.includes('required') ||
                lower.includes('must be') ||
                lower.includes('eligible')
            ) {
                res.status(400).json({ success: false, error: message });
                return;
            }
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async list(req: Request, res: Response): Promise<void> {
        try {
            const user = (req as any).user;
            if (!user || !user.userId) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required'
                    }
                });
                return;
            }

            const limitParam = Number(req.query.limit);
            const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20;
            const role = this.resolveUserRole(user);

            const payouts = role
                ? await this.payoutRepository.findByUserIdAndRole(user.userId, role, limit)
                : await this.payoutRepository.findByUserId(user.userId, limit);
            const summaries = toPayoutSummaries(payouts);

            res.status(200).json({ success: true, data: summaries, total: summaries.length });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    /**
     * GET /payouts/user/:userId
     * Persisted payout history for a single user (documented as
     * `GET /api/payout/payouts/user/:userId`). Access is restricted to the
     * owner, or admin/system callers, by the route-level guard.
     */
    async listByUser(req: Request, res: Response): Promise<void> {
        try {
            const limitParam = Number(req.query.limit);
            const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.trunc(limitParam), 100) : 20;

            const payouts = toPayoutSummaries(
                await this.payoutRepository.findByUserId(req.params.userId, limit)
            );

            res.status(200).json({
                success: true,
                data: payouts,
                total: payouts.length
            });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async getPayout(req: Request, res: Response): Promise<void> {
        try {
            const payout = await this.payoutRepository.findById(req.params.id);
            if (payout) {
                res.status(200).json({ success: true, data: toPayoutDetail(payout) });
            } else {
                res.status(404).json({ success: false, error: 'Payout not found' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async cancel(req: Request, res: Response): Promise<void> {
        try {
            await this.cancelPayoutUseCase.execute(req.params.id, req.body.reason);
            res.status(200).json({ success: true, message: 'Payout cancelled' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Internal server error';
            if (message.toLowerCase().includes('not found')) {
                res.status(404).json({ success: false, error: 'Payout not found' });
                return;
            }
            if (
                message.toLowerCase().includes('cannot cancel')
                || message.toLowerCase().includes('invalid')
                || message.toLowerCase().includes('already')
            ) {
                res.status(409).json({ success: false, error: message });
                return;
            }
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}
