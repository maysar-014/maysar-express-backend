export interface TwoFactorConfigProps {
    id: string;
    userId: string;
    method: string; // 'totp' or 'sms'
    secret: string; // Encrypted TOTP secret
    backupCodes: string[]; // Array of hashed backup codes
    isEnabled: boolean;
    isVerified: boolean;
    deviceName?: string;
    lastUsedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export class TwoFactorConfig {
    private constructor(private props: TwoFactorConfigProps) { }

    public static create(props: TwoFactorConfigProps): TwoFactorConfig {
        return new TwoFactorConfig(props);
    }

    public get id(): string { return this.props.id; }
    public get userId(): string { return this.props.userId; }
    public get method(): string { return this.props.method; }
    public get secret(): string { return this.props.secret; }
    public get backupCodes(): string[] { return this.props.backupCodes; }
    public get isEnabled(): boolean { return this.props.isEnabled; }
    public get isVerified(): boolean { return this.props.isVerified; }
    public get deviceName(): string | undefined { return this.props.deviceName; }
    public get lastUsedAt(): Date | undefined { return this.props.lastUsedAt; }
    public get createdAt(): Date { return this.props.createdAt; }
    public get updatedAt(): Date { return this.props.updatedAt; }

    /**
     * Enables 2FA for the user. Must be verified first.
     */
    public enable(): void {
        if (!this.props.isVerified) {
            throw new Error('Cannot enable two-factor authentication before it is verified.');
        }
        this.props.isEnabled = true;
        this.props.updatedAt = new Date();
    }

    /**
     * Disables 2FA for the user.
     */
    public disable(): void {
        this.props.isEnabled = false;
        this.props.updatedAt = new Date();
    }

    /**
     * Marks 2FA as verified (initial setup)
     */
    public verify(): void {
        this.props.isVerified = true;
        this.props.updatedAt = new Date();
    }

    /**
     * Updates the last used timestamp
     */
    public markAsUsed(): void {
        this.props.lastUsedAt = new Date();
        this.props.updatedAt = new Date();
    }

    /**
     * Removes a backup code after successful usage (single-use)
     */
    public useBackupCode(codeHash: string): void {
        const index = this.props.backupCodes.indexOf(codeHash);
        if (index === -1) {
            throw new Error('Invalid or already used backup code.');
        }
        this.props.backupCodes.splice(index, 1);
        this.props.updatedAt = new Date();
    }

    /**
     * Replaces all backup codes with new ones
     */
    public regenerateBackupCodes(codeHashes: string[]): void {
        this.props.backupCodes = codeHashes;
        this.props.updatedAt = new Date();
    }

    public toJSON(): TwoFactorConfigProps {
        return { ...this.props };
    }
}
