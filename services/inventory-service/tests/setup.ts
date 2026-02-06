// @ts-nocheck
process.env.NODE_ENV = 'test';
global.testUtils = {
    createMockRequest: (o = {}) => ({ body: {}, query: {}, params: {}, headers: {}, ...o }),
    createMockResponse: () => {
        const r = {};
        r.status = jest.fn().mockReturnValue(r);
        r.json = jest.fn().mockReturnValue(r);
        return r;
    }
};
