// @ts-nocheck
process.env.NODE_ENV = 'test';
global.testUtils = {
    createMockRequest: (overrides = {}) => ({ body: {}, query: {}, params: {}, headers: {}, ...overrides }),
    createMockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    }
};
