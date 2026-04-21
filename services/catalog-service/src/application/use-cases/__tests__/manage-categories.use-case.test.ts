import {
  ListCategoriesUseCase,
  CreateCategoryUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,
  CategoryConflictError,
  CategoryDeletionBlockedError,
  CategoryNotFoundError,
} from '../manage-categories.use-case';

describe('ManageCategoriesUseCases', () => {
  const mockCategoryRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findBySlug: jest.fn(),
    findSubcategories: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockProductRepository = {
    findByCategory: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists active categories in frontend shape', async () => {
    mockCategoryRepository.findAll.mockResolvedValue([
      { id: 'cat-2', name: 'Hidden', imageUrl: null, displayOrder: 1, isActive: false },
      { id: 'cat-1', name: 'Electronics', imageUrl: 'icon.png', displayOrder: 0, isActive: true },
    ]);

    const useCase = new ListCategoriesUseCase(mockCategoryRepository as any);
    await expect(useCase.execute()).resolves.toEqual([
      { id: 'cat-1', label: 'Electronics', icon: 'icon.png' }
    ]);
  });

  it('creates a category with generated slug', async () => {
    mockCategoryRepository.findBySlug.mockResolvedValue(null);
    mockCategoryRepository.save.mockResolvedValue({
      id: 'cat-1',
      name: 'Electronics',
      slug: 'electronics',
      imageUrl: 'icon.png',
      description: null,
      parentId: null,
      displayOrder: 0,
      isActive: true,
    });

    const useCase = new CreateCategoryUseCase(mockCategoryRepository as any);
    await expect(useCase.execute({ label: 'Electronics', icon: 'icon.png' })).resolves.toMatchObject({
      id: 'cat-1',
      label: 'Electronics',
      slug: 'electronics',
      icon: 'icon.png',
    });
  });

  it('rejects duplicate slugs on create', async () => {
    mockCategoryRepository.findBySlug.mockResolvedValue({ id: 'cat-9', name: 'Electronics', slug: 'electronics' });

    const useCase = new CreateCategoryUseCase(mockCategoryRepository as any);
    await expect(useCase.execute({ label: 'Electronics' })).rejects.toBeInstanceOf(CategoryConflictError);
  });

  it('updates category label and slug', async () => {
    mockCategoryRepository.findById.mockResolvedValue({
      id: 'cat-1',
      name: 'Electronics',
      slug: 'electronics',
      imageUrl: null,
      description: null,
      parentId: null,
      displayOrder: 0,
      isActive: true,
    });
    mockCategoryRepository.findBySlug.mockResolvedValue(null);
    mockCategoryRepository.update.mockResolvedValue({
      id: 'cat-1',
      name: 'Consumer Electronics',
      slug: 'consumer-electronics',
      imageUrl: null,
      description: null,
      parentId: null,
      displayOrder: 0,
      isActive: true,
    });

    const useCase = new UpdateCategoryUseCase(mockCategoryRepository as any);
    await expect(useCase.execute('cat-1', { label: 'Consumer Electronics' })).resolves.toMatchObject({
      label: 'Consumer Electronics',
      slug: 'consumer-electronics',
    });
  });

  it('blocks delete when products exist', async () => {
    mockCategoryRepository.findById.mockResolvedValue({ id: 'cat-1', name: 'Electronics', slug: 'electronics' });
    mockCategoryRepository.findSubcategories.mockResolvedValue([]);
    mockProductRepository.findByCategory.mockResolvedValue([{ id: 'prod-1' }]);

    const useCase = new DeleteCategoryUseCase(mockCategoryRepository as any, mockProductRepository as any);
    await expect(useCase.execute('cat-1')).rejects.toBeInstanceOf(CategoryDeletionBlockedError);
  });

  it('throws not found when deleting missing category', async () => {
    mockCategoryRepository.findById.mockResolvedValue(null);

    const useCase = new DeleteCategoryUseCase(mockCategoryRepository as any, mockProductRepository as any);
    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CategoryNotFoundError);
  });
});
