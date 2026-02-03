/**
 * Setup Two Factor DTOs
 * DTO Firewall Rule: No Domain Entity crosses service boundary
 */

export namespace SetupTwoFactorDTO {
  export interface Request {
    method: 'totp' | 'sms';
    deviceId?: string;
  }

  export interface Response {
    success: boolean;
    message: string;
    secret?: string;
    backupCodes?: string[];
  }
}
