// @ts-nocheck
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

global.testUtils = {
    createMockRequest: (overrides = {}) => ({
        body: {},
        query: {},
        params: {},
        headers: {},
        ...overrides
    }),
    createMockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.set = jest.fn().mockReturnValue(res);
        return res;
    },
    createMockNext: () => jest.fn()
};

beforeEach(() => {
    jest.clearAllMocks();
});
