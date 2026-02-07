export class TwoFactorPolicy {
    /**
     * Checks if a user is eligible to setup 2FA.
     * Business rules: user must be active.
     */
    public static canEnableTwoFactor(user: { status: string }): boolean {
        const activeStatuses = ['active', 'ACTIVE', 'active_confirmed'];
        return activeStatuses.includes(user.status);
    }

    /**
     * Checks if a user is allowed to disable 2FA.
     */
    public static canDisableTwoFactor(user: any): boolean {
        // In some systems, certain roles might be prevented from disabling 2FA
        return true;
    }

    /**
     * Checks if 2FA is mandatory for a specific role.
     */
    public static requiresTwoFactor(role: string): boolean {
        const sensitiveRoles = ['admin', 'system', 'seller', 'enabler', 'courier'];
        return sensitiveRoles.includes(role.toLowerCase());
    }

    /**
     * Validates if a backup code can be used based on remaining count.
     */
    public static canUseBackupCode(remainingCodes: number): boolean {
        return remainingCodes > 0;
    }

    /**
     * Validates the 2FA method (only 'totp' and 'sms' are supported).
     */
    public static isValidMethod(method: string): boolean {
        return ['totp', 'sms'].includes(method.toLowerCase());
    }
}
