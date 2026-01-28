describe('import global test setup file', () => {
  test('require the tests/setup file directly', () => {
    const mod = require('../../tests/setup');
    expect(mod).toBeDefined();
    // ensure globals are present
    expect((global as any).testUtils).toBeDefined();
    expect((global as any).userFactories).toBeDefined();
  });
});
