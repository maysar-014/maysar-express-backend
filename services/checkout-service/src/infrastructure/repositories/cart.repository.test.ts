import { CartRepository } from './cart.repository';

describe('CartRepository', () => {
  let repository: CartRepository;

  beforeEach(() => {
    repository = new CartRepository();
  });

  it('should instantiate', () => {
    expect(repository).toBeDefined();
  });
});
