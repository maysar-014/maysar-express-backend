// @ts-nocheck
import { Request, Response } from 'express';
import { DependencyContainer } from '../../infrastructure/container';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class CODController {
    private container: DependencyContainer;

    constructor() {
        this.container = DependencyContainer.getInstance();
    }

    private isContractTestRequest(req: Request): boolean {
        return String(req.headers?.['x-contract-test'] || '').trim() === '1' && process.env.NODE_ENV !== 'production';
    }

    /**
     * Endpoint to verify a COD delivery attempt.
     * Required by couriers at the point of delivery.
     */
    async generateOTP(req: Request, res: Response): Promise<void> {
        try {
            const { deliveryId } = req.params;
            console.log(`[COD] Requesting OTP generation for delivery ${deliveryId}`);

            const initiateCODDeliveryUseCase = this.container.getInitiateCODDeliveryUseCase();
            await initiateCODDeliveryUseCase.execute({ deliveryId });

            res.status(200).json({
                success: true,
                message: 'OTP generated and sent to buyer'
            });
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'OTP generation failed';
            const status = message.toLowerCase().includes('not found') ? 404 : 400;
            console.error(`[COD] OTP generation failed:`, message);
            res.status(status).json({
                success: false,
                error: message
            });
        }
    }

    /**
     * Endpoint to verify a COD delivery attempt.
     * Required by couriers at the point of delivery.
     */
    async verifyDelivery(req: Request, res: Response): Promise<void> {
        try {
            const { deliveryId } = req.params;
            const { otp, location } = req.body;

            // The courier's position is mandatory evidence. It previously defaulted
            // to {lat: 0, lng: 0} when absent, which is a real coordinate off the
            // coast of Africa: it silently fabricated delivery proof and, because
            // the proximity gate ran against it, quietly failed every legitimate
            // verification too.
            if (!otp || !location?.lat || !location?.lng) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required verification data (otp, lat, lng)'
                });
                return;
            }

            // A real GeoPoint is required, not a bare `{ lat, lng }` object. The
            // settlement saga compares the courier's position against the delivery
            // address with `currentPos.distanceTo(deliveryPos)`, and a plain object
            // has no `distanceTo` method - so the proximity check threw a TypeError,
            // the saga compensated from index -1 (nothing to undo) and the delivery
            // silently stayed `in_transit` while this endpoint still replied 200.
            // The previous `as any` cast hid the type error, made invisible by the
            // `@ts-nocheck` at the top of this file.
            const verifyLocation = GeoPoint.create(
                parseFloat(location.lat),
                parseFloat(location.lng),
                location.address || 'Courier reported position'
            );

            console.log(`[COD] Verifying delivery ${deliveryId} with OTP ${otp}`);

            const verifyCODDeliveryUseCase = this.container.getVerifyCODDeliveryUseCase();
            await verifyCODDeliveryUseCase.execute({
                deliveryId,
                otp,
                location: verifyLocation
            });

            res.status(200).json({
                success: true,
                message: 'COD Verification successful. Payment settlement and reputation update triggered.'
            });
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'COD verification failed';
            const lowered = message.toLowerCase();
            const status = lowered.includes('not found')
                ? 404
                : lowered.includes('already') || lowered.includes('invalid')
                    ? 409
                    : 400;
            console.error(`[COD] Verification failed for delivery ${req.params.deliveryId}:`, message);
            res.status(status).json({
                success: false,
                error: {
                    code: 'COD_VERIFICATION_FAILED',
                    message
                }
            });
        }
    }
}
