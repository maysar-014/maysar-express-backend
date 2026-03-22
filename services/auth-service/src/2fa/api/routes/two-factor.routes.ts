import { Router } from 'express';
import { TwoFactorController } from '../controllers/two-factor.controller';
import { asyncHandler } from '@shared/middleware/async-handler';
import { validateRequest } from '../../../api/middleware/validation.middleware';

/**
 * Creates and configures the Express router for 2FA operations.
 */
export function createTwoFactorRouter(controller: TwoFactorController): Router {
    const router = Router();

    /**
     * @route POST /api/v1/auth/2fa/setup
     * @desc Initiate 2FA setup
     */
    router.post(
        '/setup',
        validateRequest({
            body: {
                userId: { type: 'string', required: false, minLength: 1 },
                email: { type: 'string', required: false, format: 'email' },
                method: { type: 'string', required: false, minLength: 1 },
                deviceName: { type: 'string', required: false, minLength: 1 }
            }
        }),
        asyncHandler((req, res) => controller.setup(req, res))
    );

    /**
     * @route POST /api/v1/auth/2fa/verify-setup
     * @desc Verify and enable 2FA
     */
    router.post(
        '/verify-setup',
        validateRequest({
            body: {
                userId: { type: 'string', required: true, minLength: 1 },
                code: { type: 'string', required: true, pattern: /^\d{6}$/ }
            }
        }),
        asyncHandler((req, res) => controller.verifySetup(req, res))
    );

    /**
     * @route POST /api/v1/auth/2fa/verify
     * @desc Verify TOTP code during login
     */
    router.post(
        '/verify',
        validateRequest({
            body: {
                userId: { type: 'string', required: true, minLength: 1 },
                code: { type: 'string', required: true, pattern: /^\d{6}$/ }
            }
        }),
        asyncHandler((req, res) => controller.verifyLogin(req, res))
    );

    /**
     * @route POST /api/v1/auth/2fa/backup
     * @desc Verify backup code
     */
    router.post(
        '/backup',
        validateRequest({
            body: {
                userId: { type: 'string', required: true, minLength: 1 },
                code: { type: 'string', required: true, minLength: 1 }
            }
        }),
        asyncHandler((req, res) => controller.verifyBackupCode(req, res))
    );

    /**
     * @route POST /api/v1/auth/2fa/disable
     * @desc Disable 2FA
     */
    router.post(
        '/disable',
        validateRequest({
            body: {
                userId: { type: 'string', required: false, minLength: 1 },
                code: { type: 'string', required: true, minLength: 1 }
            }
        }),
        asyncHandler((req, res) => controller.disable(req, res))
    );

    /**
     * @route POST /api/v1/auth/2fa/backup-codes/regenerate
     * @desc Regenerate backup codes
     */
    router.post(
        '/backup-codes/regenerate',
        validateRequest({
            body: {
                userId: { type: 'string', required: true, minLength: 1 }
            }
        }),
        asyncHandler((req, res) => controller.regenerateBackupCodes(req, res))
    );

    /**
     * @route GET /api/v1/auth/2fa/status
     * @desc Get 2FA status
     */
    router.get('/status', asyncHandler((req, res) => controller.getStatus(req, res)));

    return router;
}
