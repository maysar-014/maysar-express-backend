/**
 * Seller stock verification configuration.
 * Read from environment variables at startup; stored on each order row at creation
 * so in-flight orders are not affected by subsequent config changes.
 */
export const verificationConfig = {
  /**
   * How many minutes the seller has to confirm stock after order placement.
   * Defaults to 30 minutes if the env var is absent or invalid.
   */
  get timeoutMinutes(): number {
    const raw = process.env.SELLER_VERIFICATION_TIMEOUT_MINUTES;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 30;
  },
};
