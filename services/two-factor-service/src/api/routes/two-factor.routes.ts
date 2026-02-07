import { Router } from 'express';
import { TwoFactorController } from '../controllers/two-factor.controller';

/**
 * Creates and configures the Express router for 2FA operations.
 */
export function createTwoFactorRouter(controller: TwoFactorController): Router {
    const router = Router();

    /**
     * @route POST /api/v1/auth/2fa/setup
     * @desc Initiate 2FA setup
     */
    router.post('/setup', (req, res) => controller.setup(req, res));

    /**
     * @route POST /api/v1/auth/2fa/verify-setup
     * @desc Verify and enable 2FA
     */
    router.post('/verify-setup', (req, res) => controller.verifySetup(req, res));

    /**
     * @route POST /api/v1/auth/2fa/verify
     * @desc Verify TOTP code during login
     */
    router.post('/verify', (req, res) => controller.verifyLogin(req, res));

    /**
     * @route POST /api/v1/auth/2fa/backup
     * @desc Verify backup code
     */
    router.post('/backup', (req, res) => controller.verifyBackupCode(req, res));

    /**
     * @route POST /api/v1/auth/2fa/disable
     * @desc Disable 2FA
     */
    router.post('/disable', (req, res) => controller.disable(req, res));

    /**
     * @route POST /api/v1/auth/2fa/backup-codes/regenerate
     * @desc Regenerate backup codes
     */
    router.post('/backup-codes/regenerate', (req, res) => controller.regenerateBackupCodes(req, res));

    /**
     * @route GET /api/v1/auth/2fa/status
     * @desc Get 2FA status
     */
    router.get('/status', (req, res) => controller.getStatus(req, res));

    return router;
}
