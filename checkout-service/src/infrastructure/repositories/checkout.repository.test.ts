import { CheckoutRepository } from './checkout.repository';

describe('CheckoutRepository', () => {
  let repository: CheckoutRepository;

  beforeEach(() => {
    repository = new CheckoutRepository();
  });

  it('should instantiate', () => {
    expect(repository).toBeDefined();
  });
});
