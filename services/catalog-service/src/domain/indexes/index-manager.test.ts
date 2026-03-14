import { IndexManager } from './index-manager';

describe('IndexManager', () => {
  const products = [
    { id: 'p1', name: 'A', price: 10, views: 100, purchases: 10, rating: 5 },
    { id: 'p2', name: 'B', price: 20, views: 0, purchases: 0, rating: 3 }
  ];

  const makeDeps = () => {
    const invertedIndex = {
      build: jest.fn(),
      addProduct: jest.fn(),
      removeProduct: jest.fn()
    };
    const filterIndex = {
      build: jest.fn(),
      addProduct: jest.fn(),
      removeProduct: jest.fn()
    };
    const ngramIndex = {
      build: jest.fn(),
      addProduct: jest.fn(),
      removeProduct: jest.fn()
    };
    const facetIndex = {
      build: jest.fn(),
      updateProduct: jest.fn()
    };
    const offlineRanker = {
      computePopularityScores: jest.fn(),
      setScore: jest.fn()
    };

    return { invertedIndex, filterIndex, ngramIndex, facetIndex, offlineRanker };
  };

  it('initializes indexes and computes popularity scores', async () => {
    const deps = makeDeps();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const manager = new IndexManager(
      deps.invertedIndex as never,
      deps.filterIndex as never,
      deps.ngramIndex as never,
      deps.facetIndex as never,
      deps.offlineRanker as never
    );

    await manager.initialize(products as any);

    expect(deps.invertedIndex.build).toHaveBeenCalledWith(products);
    expect(deps.filterIndex.build).toHaveBeenCalledWith(products);
    expect(deps.ngramIndex.build).toHaveBeenCalledWith(products);
    expect(deps.facetIndex.build).toHaveBeenCalledWith(products);
    expect(deps.offlineRanker.computePopularityScores).toHaveBeenCalledWith(
      products,
      expect.any(Map)
    );
    expect(logSpy).toHaveBeenCalledWith('Initializing indexes with 2 products...');
  });

  it('handles product created, updated and deleted lifecycle', () => {
    const deps = makeDeps();
    const manager = new IndexManager(
      deps.invertedIndex as never,
      deps.filterIndex as never,
      deps.ngramIndex as never,
      deps.facetIndex as never,
      deps.offlineRanker as never
    );

    manager.onProductCreated(products[0] as any);
    manager.onProductUpdated(products[0] as any, products[1] as any);
    manager.onProductDeleted('p1', products[0] as any);

    expect(deps.invertedIndex.addProduct).toHaveBeenCalledWith(products[0]);
    expect(deps.invertedIndex.removeProduct).toHaveBeenCalledWith('p1');
    expect(deps.filterIndex.removeProduct).toHaveBeenCalledWith('p1', products[0]);
    expect(deps.ngramIndex.removeProduct).toHaveBeenCalledWith('p1', products[0]);
    expect(deps.facetIndex.updateProduct).toHaveBeenCalledWith(products[0], products[1]);
    expect(deps.offlineRanker.setScore).toHaveBeenCalledWith('p1', 0);
  });
});
