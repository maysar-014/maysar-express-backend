export { };

declare global {
    let testStartTime: number;
    let testConfig: {
        apiTimeout: number;
        maxRetries: number;
        cacheTimeout: number;
        loadTestRPS: number;
        accuracyTarget: number;
    };
    let testCache: {
        clear: () => Promise<void>;
    };
    let testDb: {
        close: () => Promise<void>;
    };
}
