import { errorHandler } from './checkout.middleware';

describe('Checkout Middleware', () => {
  it('should define error handler', () => {
    expect(errorHandler).toBeDefined();
  });
});
