import { Request, Response } from 'express';
import { DependencyContainer } from '../../infrastructure/container';

export class CODController {
    private container: DependencyContainer;

    constructor() {
        this.container = DependencyContainer.getInstance();
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
            console.error(`[COD] OTP generation failed:`, error.message);
            res.status(400).json({
                success: false,
                error: error.message
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

            if (!otp || !location || !location.lat || !location.lng) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required verification data (otp, lat, lng)'
                });
                return;
            }

            console.log(`[COD] Verifying delivery ${deliveryId} with OTP ${otp} at location ${location.lat}, ${location.lng}`);

            const verifyCODDeliveryUseCase = this.container.getVerifyCODDeliveryUseCase();
            await verifyCODDeliveryUseCase.execute({
                deliveryId,
                otp,
                location: {
                    lat: parseFloat(location.lat),
                    lng: parseFloat(location.lng)
                }
            });

            res.status(200).json({
                success: true,
                message: 'COD Verification successful. Payment settlement and reputation update triggered.'
            });
        } catch (error: any) {
            console.error(`[COD] Verification failed for delivery ${req.params.deliveryId}:`, error.message);
            res.status(400).json({
                success: false,
                error: {
                    code: 'COD_VERIFICATION_FAILED',
                    message: error.message
                }
            });
        }
    }
}
