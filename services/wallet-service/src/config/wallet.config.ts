export const walletConfig = {
    limits: {
        dailyTransactionCount: 100,
        dailyTransactionAmount: 10000000, // 100,000.00
        monthlyTransactionAmount: 50000000, // 500,000.00
        singleTransactionMax: 5000000, // 50,000.00
        minimumBalance: 0,
        maxFrozenRatio: 0.8
    },
    velocity: {
        maxTransactionsPerMinute: 5,
        maxTransactionsPerHour: 20,
        maxAmountPerHour: 1000000, // 10,000.00
        suspiciousPatternThreshold: 3
    },
    holds: {
        defaultExpirySeconds: 86400, // 24 hours
        maxExpirySeconds: 604800 // 1 week
    },
    audit: {
        enabled: true,
        detailedLogging: true
    }
};
