describe('global test setup utilities', () => {
  test('testUtils helpers exist and behave', async () => {
    expect((global as any).testUtils).toBeDefined();
    expect(typeof (global as any).testUtils.createMockRequest).toBe('function');
    const req = (global as any).testUtils.createMockRequest({ body: { a: 1 } });
    expect(req.body.a).toBe(1);

    const res = (global as any).testUtils.createMockResponse();
    expect(typeof res.status).toBe('function');
    res.status(200).json({ ok: true });
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  test('userFactories create objects', () => {
    expect((global as any).userFactories).toBeDefined();
    const email = (global as any).userFactories.createEmail('x@y.com');
    expect(email.toString()).toBe('x@y.com');

    const user = (global as any).userFactories.createUser();
    expect(user.email).toBeDefined();
    expect(user.firstName).toBeDefined();
  });

  test('mockServices provide in-memory implementations', () => {
    const mockServices = (global as any).mockServices || {};
    const factory = mockServices.InMemoryEmailService;
    expect(factory).toBeDefined();
    expect(typeof factory).toBe('function');
  });
});
