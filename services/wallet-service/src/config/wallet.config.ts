/**
 * Wallet service configuration.
 *
 * Production defaults are conservative. Live e2e tests that need higher limits
 * should set the corresponding environment variables (WALLET_SINGLE_TX_MAX, etc.)
 * in .env or .env.test rather than changing the defaults here.
 */
export const walletConfig = {
    limits: {
        dailyTransactionCount: 100,
        dailyTransactionAmount: 100_000_000,   // 1,000,000.00 TZS
        monthlyTransactionAmount: 1_000_000_000, // 10,000,000.00 TZS
        // 5,000,000 minor units = 50,000.00 TZS (production conservative default).
        // Override via WALLET_SINGLE_TX_MAX for live e2e when seeded products exceed this.
        singleTransactionMax: Number(process.env.WALLET_SINGLE_TX_MAX) || 5_000_000,
        minimumBalance: 0,
        maxFrozenRatio: 0.8
    },
    velocity: {
        // 5 tx/min, 20 tx/hr, suspicious repetition at 3 — production defaults.
        // Override via environment variables for live e2e or load testing only.
        maxTransactionsPerMinute: Number(process.env.WALLET_MAX_TX_PER_MINUTE) || 5,
        maxTransactionsPerHour: Number(process.env.WALLET_MAX_TX_PER_HOUR) || 20,
        maxAmountPerHour: Number(process.env.WALLET_MAX_AMOUNT_PER_HOUR) || 50_000_000,
        suspiciousPatternThreshold: Number(process.env.WALLET_SUSPICIOUS_PATTERN_THRESHOLD) || 3
    },
    holds: {
        defaultExpirySeconds: 86400, // 24 hours
        maxExpirySeconds: 604800     // 1 week
    },
    audit: {
        enabled: true,
        detailedLogging: true
    }
};
