describe('Exercise test setup utilities for coverage', () => {
  test('factories, testUtils, mockServices, and custom matchers', async () => {
    // Ensure global utilities exist
    const tu = (global as any).testUtils;
    const uf = (global as any).userFactories;
    const ms = (global as any).mockServices;

    expect(tu).toBeDefined();
    expect(uf).toBeDefined();
    expect(ms).toBeDefined();

    // testUtils helpers
    expect(typeof tu.resetAllMocks).toBe('function');
    await tu.waitFor(1);
    const req = tu.createMockRequest({ body: { x: 1 } });
    const res = tu.createMockResponse();
    const ctx = tu.createMockContext(req, res);
    expect(ctx.req.body.x).toBe(1);

    // userFactories
    const email = uf.createEmail('z@z.com');
    expect(email.toString()).toBe('z@z.com');

    const phone = uf.createPhoneNumber('+255712345678');
    expect(phone.toString()).toBe('+255712345678');

    const addr = uf.createAddress({ city: 'Arusha' });
    expect(addr.toString()).toContain('Arusha');
    expect(addr.equals(uf.createAddress({ city: 'Arusha' }))).toBe(true);

    const u = uf.createUser({ firstName: 'X' });
    expect(u.firstName).toBe('X');

    // mockServices
    const EmailFactory = ms.InMemoryEmailService;
    expect(typeof EmailFactory).toBe('function');

    const CacheFactory = ms.InMemoryCacheService;
    expect(typeof CacheFactory).toBe('function');

    // custom matchers (use any cast to satisfy TS)
    (expect as any)([1, 2, 3]).toBeSorted();
    (expect as any)(5).toBeWithinRange(1, 10);
  });
});
