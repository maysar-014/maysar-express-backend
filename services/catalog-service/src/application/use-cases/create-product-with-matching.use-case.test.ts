import { CreateProductWithMatchingUseCase } from './create-product-with-matching.use-case';

describe('CreateProductWithMatchingUseCase', () => {
  it('returns auto-merge result when strong match is found', async () => {
    const matchResult = {
      matchFound: true,
      confirmationRequired: false,
      productId: 'prod-1'
    };
    const matchProductUseCase = {
      execute: jest.fn().mockResolvedValue(matchResult)
    };
    const useCase = new CreateProductWithMatchingUseCase(
      matchProductUseCase as never,
      {} as never
    );

    const result = await useCase.execute({ title: 'Product' } as never);

    expect(matchProductUseCase.execute).toHaveBeenCalledWith({ title: 'Product' });
    expect(result).toBe(matchResult);
  });

  it('returns confirmation-required and no-match branches as-is', async () => {
    const confirmationResult = {
      matchFound: true,
      confirmationRequired: true
    };
    const noMatchResult = {
      matchFound: false,
      confirmationRequired: false
    };
    const matchProductUseCase = {
      execute: jest
        .fn()
        .mockResolvedValueOnce(confirmationResult)
        .mockResolvedValueOnce(noMatchResult)
    };
    const useCase = new CreateProductWithMatchingUseCase(
      matchProductUseCase as never,
      {} as never
    );

    await expect(useCase.execute({ sku: '1' } as never)).resolves.toBe(confirmationResult);
    await expect(useCase.execute({ sku: '2' } as never)).resolves.toBe(noMatchResult);
  });
});

