import application from '../main';

describe('main application', () => {
  test('application exports an express app via getApp', () => {
    expect(application).toBeDefined();
    expect(typeof application.getApp).toBe('function');
    const app = application.getApp();
    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
  });
});
