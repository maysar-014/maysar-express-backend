// @ts-nocheck
process.env.NODE_ENV = 'test';
process.env.METRICS_ENABLED = 'false';
process.env.PAYMENT_RATE_LIMIT_DISABLED = 'true';

const mockCreatePipeline = () => {
    const pipeline = {
        setex: jest.fn(() => pipeline),
        del: jest.fn(() => pipeline),
        exec: jest.fn(async () => [])
    };

    return pipeline;
};

const mockRedisClient = {
    on: jest.fn(),
    get: jest.fn(async () => null),
    set: jest.fn(async () => 'OK'),
    setex: jest.fn(async () => 'OK'),
    del: jest.fn(async () => 1),
    eval: jest.fn(async () => [1, 60000]),
    ping: jest.fn(async () => 'PONG'),
    quit: jest.fn(async () => 'OK'),
    disconnect: jest.fn(),
    multi: jest.fn(() => mockCreatePipeline())
};

jest.mock('../../../shared/redis/ioredis-client', () => ({
    getSharedRedisClient: jest.fn(() => mockRedisClient),
    resolveRedisUrl: jest.fn((redisUrl?: string) => redisUrl || 'redis://mock'),
    attachRedisErrorHandlers: jest.fn()
}));

global.testUtils = {
    createMockRequest: (o = {}) => ({ body: {}, query: {}, params: {}, headers: {}, ...o }),
    createMockResponse: () => {
        const r = {};
        r.status = jest.fn().mockReturnValue(r);
        r.json = jest.fn().mockReturnValue(r);
        return r;
    }
};
