import { v4 as uuidv4 } from 'uuid';
import { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { TotpEngine } from '../../domain/engines/totp.engine';
import { BackupCodeEngine } from '../../domain/engines/backup-code.engine';
import { TwoFactorConfig } from '../../domain/entities/two-factor-config.entity';
import { QRCodeService } from '../../infrastructure/services/qr-code.service';
import { SetupTwoFactorRequestDTO, SetupTwoFactorResponseDTO } from '../dto/two-factor.dto';

export class SetupTwoFactorUseCase {
    constructor(
        private readonly repository: ITwoFactorRepository,
        private readonly qrCodeService: QRCodeService,
        private readonly issuer: string = 'Maysar'
    ) { }

    /**
     * Initiates two-factor authentication setup for a user.
     * Generates a secret, QR code, and backup codes.
     */
    public async execute(
        userId: string,
        userEmail: string,
        request: SetupTwoFactorRequestDTO
    ): Promise<SetupTwoFactorResponseDTO> {

        // 1. Check if user already has 2FA enabled
        const existingConfig = await this.repository.findByUserId(userId);
        if (existingConfig && existingConfig.isEnabled) {
            throw new Error('Two-factor authentication is already enabled for this user.');
        }

        // 2. Generate TOTP secret
        const secret = TotpEngine.generateSecret();
        const uri = TotpEngine.generateQRCodeUri(secret.getValue(), userEmail, this.issuer);

        // 3. Generate backup codes
        const backupCodes = await BackupCodeEngine.generateCodes(10);
        const plainBackupCodes = backupCodes.map(c => c.plain);
        const hashedBackupCodes = backupCodes.map(c => c.hash);

        // 4. Generate QR code data URL
        const qrCodeDataUrl = await this.qrCodeService.generateDataURL(uri);

        // 5. Create and save config
        const config = TwoFactorConfig.create({
            id: uuidv4(),
            userId,
            method: request.method,
            secret: secret.getValue(), // Repository should handle encryption
            backupCodes: hashedBackupCodes,
            isEnabled: false,
            isVerified: false,
            deviceName: request.deviceName,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await this.repository.save(config);

        // 6. Return setup data to user
        return {
            secret: secret.getValue(),
            qrCodeDataUrl,
            backupCodes: plainBackupCodes,
            uri
        };
    }
}
