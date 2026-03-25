import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { GenerateEnablerReferralLinkUseCase } from '../../application/use-cases/generate-enabler-referral-link.use-case';
import { GetEnablerReferralLinkUseCase } from '../../application/use-cases/get-enabler-referral-link.use-case';
import { TrackEnablerReferralEventUseCase } from '../../application/use-cases/track-enabler-referral-event.use-case';

export class ReferralController {
    constructor(
        private readonly generateReferralLinkUseCase: GenerateEnablerReferralLinkUseCase,
        private readonly getReferralLinkUseCase: GetEnablerReferralLinkUseCase,
        private readonly trackReferralEventUseCase: TrackEnablerReferralEventUseCase
    ) { }

    private shouldIncludeQr(input: unknown): boolean {
        const includeQR = (input as any)?.includeQR;

        if (includeQR === undefined || includeQR === null) {
            return true;
        }

        if (typeof includeQR === 'boolean') {
            return includeQR;
        }

        if (typeof includeQR === 'string') {
            const normalized = includeQR.trim().toLowerCase();
            if (['false', '0', 'no', 'off'].includes(normalized)) {
                return false;
            }
            if (['true', '1', 'yes', 'on'].includes(normalized)) {
                return true;
            }
        }

        return Boolean(includeQR);
    }

    private async toResponse(payload: any, includeQR: boolean) {
        const response = { ...payload } as Record<string, unknown>;
        if (includeQR) {
            response.qrCode = await QRCode.toDataURL(String(payload.shareUrl), {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                width: 300,
                margin: 1
            });
        }
        return response;
    }

    private respondError(res: Response, error: unknown): void {
        const message = error instanceof Error ? error.message : 'Referral request failed';
        const lower = message.toLowerCase();
        let status = 400;
        if (lower.includes('not found')) {
            status = 404;
        } else if (lower.includes('only available for approved')) {
            status = 409;
        }
        res.status(status).json({ error: message });
    }

    async getReferralLink(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.getReferralLinkUseCase.execute(req.params.enablerId);
            res.status(200).json({
                success: true,
                data: await this.toResponse(result, this.shouldIncludeQr(req.query)),
                meta: { timestamp: new Date().toISOString() }
            });
        } catch (error) {
            this.respondError(res, error);
        }
    }

    async generateReferralLink(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.generateReferralLinkUseCase.execute(req.params.enablerId, req.body || {});
            res.status(200).json({
                success: true,
                data: await this.toResponse(result, this.shouldIncludeQr(req.body)),
                meta: { timestamp: new Date().toISOString() }
            });
        } catch (error) {
            this.respondError(res, error);
        }
    }

    async trackReferralEvent(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.trackReferralEventUseCase.execute(req.params.enablerId, req.body.eventType);
            res.status(200).json({
                success: true,
                data: await this.toResponse(result, false),
                meta: { timestamp: new Date().toISOString() }
            });
        } catch (error) {
            this.respondError(res, error);
        }
    }
}
