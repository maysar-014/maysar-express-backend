export interface SetupTwoFactorRequestDTO {
    method: 'totp' | 'sms';
    deviceName?: string;
}

export interface SetupTwoFactorResponseDTO {
    secret: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
    uri: string;
}

export interface VerifyTwoFactorRequestDTO {
    code: string;
}

export interface VerifyTwoFactorResponseDTO {
    success: boolean;
    message: string;
}

export interface DisableTwoFactorRequestDTO {
    password?: string;
    code?: string;
}

export interface VerifyBackupCodeRequestDTO {
    code: string;
}

export interface TwoFactorStatusResponseDTO {
    isEnabled: boolean;
    isVerified: boolean;
    method: string;
    deviceName?: string;
    backupCodesCount: number;
    lastUsedAt?: Date;
}
