import { Request, Response } from 'express';
import { SetupTwoFactorUseCase } from '../../application/use-cases/setup-two-factor.use-case';
import { VerifyTwoFactorSetupUseCase } from '../../application/use-cases/verify-two-factor-setup.use-case';
import { VerifyTwoFactorLoginUseCase } from '../../application/use-cases/verify-two-factor-login.use-case';
import { VerifyBackupCodeUseCase } from '../../application/use-cases/verify-backup-code.use-case';
import { DisableTwoFactorUseCase } from '../../application/use-cases/disable-two-factor.use-case';
import { RegenerateBackupCodesUseCase } from '../../application/use-cases/regenerate-backup-codes.use-case';
import { GetTwoFactorStatusUseCase } from '../../application/use-cases/get-two-factor-status.use-case';

/**
 * TwoFactorController handles HTTP requests for 2FA operations.
 */
export class TwoFactorController {
    constructor(
        private readonly setupTwoFactorUseCase: SetupTwoFactorUseCase,
        private readonly verifyTwoFactorSetupUseCase: VerifyTwoFactorSetupUseCase,
        private readonly verifyTwoFactorLoginUseCase: VerifyTwoFactorLoginUseCase,
        private readonly verifyBackupCodeUseCase: VerifyBackupCodeUseCase,
        private readonly disableTwoFactorUseCase: DisableTwoFactorUseCase,
        private readonly regenerateBackupCodesUseCase: RegenerateBackupCodesUseCase,
        private readonly getTwoFactorStatusUseCase: GetTwoFactorStatusUseCase
    ) { }

    public async setup(req: Request, res: Response): Promise<void> {
        try {
            const { method, deviceName } = req.body;
            const userId = (req as any).user?.id || req.body.userId;
            const userEmail = (req as any).user?.email || req.body.email;

            if (!userId || !userEmail) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const result = await this.setupTwoFactorUseCase.execute(userId, userEmail, { method, deviceName });
            res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    public async verifySetup(req: Request, res: Response): Promise<void> {
        try {
            const { code } = req.body;
            const userId = (req as any).user?.id || req.body.userId;

            if (!userId) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const result = await this.verifyTwoFactorSetupUseCase.execute(userId, code);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    public async verifyLogin(req: Request, res: Response): Promise<void> {
        try {
            const { userId, code } = req.body;
            if (!userId || !code) {
                res.status(400).json({ success: false, error: 'User ID and code are required' });
                return;
            }

            const isValid = await this.verifyTwoFactorLoginUseCase.execute(userId, code);
            res.status(200).json({ success: isValid });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    public async verifyBackupCode(req: Request, res: Response): Promise<void> {
        try {
            const { userId, code } = req.body;
            if (!userId || !code) {
                res.status(400).json({ success: false, error: 'User ID and code are required' });
                return;
            }

            const isValid = await this.verifyBackupCodeUseCase.execute(userId, code);
            res.status(200).json({ success: isValid });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    public async disable(req: Request, res: Response): Promise<void> {
        try {
            const { code } = req.body;
            const userId = (req as any).user?.id || req.body.userId;

            if (!userId) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const success = await this.disableTwoFactorUseCase.execute(userId, code);
            res.status(200).json({ success });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    public async regenerateBackupCodes(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || req.body.userId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const codes = await this.regenerateBackupCodesUseCase.execute(userId);
            res.status(200).json({ success: true, backupCodes: codes });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    public async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || req.body.userId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const status = await this.getTwoFactorStatusUseCase.execute(userId);
            res.status(200).json({ success: true, data: status });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
}
