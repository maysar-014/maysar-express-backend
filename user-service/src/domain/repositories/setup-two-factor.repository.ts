/**
 * Setup Two Factor Repository Port
 * Infrastructure Isolation Rule: Domain Interface defines contract
 * Infrastructure Adapter implements this contract
 */

export interface ISetupTwoFactorRepository {
  setupTwoFactor(userId: string, config: {
    method: 'totp' | 'sms';
    secret?: string;
    backupCodes: string[];
    deviceId?: string;
    enabled: boolean;
  }): Promise<void>;
}
