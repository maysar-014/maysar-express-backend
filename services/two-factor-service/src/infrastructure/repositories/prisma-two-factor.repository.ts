import { PrismaClient } from '@prisma/client';
import { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { TwoFactorConfig } from '../../domain/entities/two-factor-config.entity';
import { EncryptionService } from '../services/encryption.service';

/**
 * Prisma implementation of the TwoFactorRepository.
 * Handles persistence and encryption/decryption of secrets.
 */
export class PrismaTwoFactorRepository implements ITwoFactorRepository {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly encryptionService: EncryptionService
    ) { }

    /**
     * Retrieves 2FA config for a user and decrypts the secret.
     */
    public async findByUserId(userId: string): Promise<TwoFactorConfig | null> {
        const record = await this.prisma.user_TwoFactorAuth.findUnique({
            where: { userId }
        });

        if (!record) {
            return null;
        }

        // Decrypt the TOTP secret for use in the domain engines
        const decryptedSecret = this.encryptionService.decrypt(record.secret);

        return TwoFactorConfig.create({
            id: record.id,
            userId: record.userId,
            method: record.method,
            secret: decryptedSecret,
            backupCodes: record.backupCodes as string[],
            isEnabled: record.isEnabled,
            isVerified: record.isVerified,
            deviceName: record.deviceName || undefined,
            lastUsedAt: record.lastUsedAt || undefined,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt
        });
    }

    /**
     * Saves or updates 2FA config. Encrypts the secret before storing.
     */
    public async save(config: TwoFactorConfig): Promise<void> {
        const props = config.toJSON();
        const encryptedSecret = this.encryptionService.encrypt(props.secret);

        // Upsert the 2FA configuration
        await this.prisma.user_TwoFactorAuth.upsert({
            where: { userId: props.userId },
            create: {
                id: props.id,
                userId: props.userId,
                method: props.method,
                secret: encryptedSecret,
                backupCodes: props.backupCodes,
                isEnabled: props.isEnabled,
                isVerified: props.isVerified,
                deviceName: props.deviceName,
                lastUsedAt: props.lastUsedAt,
                createdAt: props.createdAt,
                updatedAt: props.updatedAt
            },
            update: {
                method: props.method,
                secret: encryptedSecret,
                backupCodes: props.backupCodes,
                isEnabled: props.isEnabled,
                isVerified: props.isVerified,
                deviceName: props.deviceName,
                lastUsedAt: props.lastUsedAt,
                updatedAt: props.updatedAt
            }
        });

        // Synchronize the isEnabled status with the main Auth_User record
        // This allows quick checks in the auth flow without joined queries
        await this.prisma.auth_User.update({
            where: { id: props.userId },
            data: {
                twoFactorEnabled: props.isEnabled,
                twoFactorSecret: encryptedSecret
            }
        });
    }

    /**
     * Removes 2FA configuration for a user.
     */
    public async deleteByUserId(userId: string): Promise<void> {
        await this.prisma.user_TwoFactorAuth.delete({
            where: { userId }
        });

        await this.prisma.auth_User.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null
            }
        });
    }

    /**
     * Updates only the backup codes for a user.
     */
    public async updateBackupCodes(userId: string, codeHashes: string[]): Promise<void> {
        await this.prisma.user_TwoFactorAuth.update({
            where: { userId },
            data: {
                backupCodes: codeHashes,
                updatedAt: new Date()
            }
        });
    }

    /**
     * Removes a single backup code from the user's stored list.
     */
    public async markBackupCodeAsUsed(userId: string, codeHash: string): Promise<void> {
        const record = await this.prisma.user_TwoFactorAuth.findUnique({
            where: { userId },
            select: { backupCodes: true }
        });

        if (!record) return;

        const currentCodes = record.backupCodes as string[];
        const updatedCodes = currentCodes.filter(h => h !== codeHash);

        await this.prisma.user_TwoFactorAuth.update({
            where: { userId },
            data: {
                backupCodes: updatedCodes,
                updatedAt: new Date()
            }
        });
    }
}
