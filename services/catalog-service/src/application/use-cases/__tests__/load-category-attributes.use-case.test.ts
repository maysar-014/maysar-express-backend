import { LoadCategoryAttributesUseCase } from '../load-category-attributes.use-case';

describe('LoadCategoryAttributesUseCase', () => {
  const mockCategoryRepository = {
    findById: jest.fn(),
  };

  const mockCategoryAttributeRepository = {
    findByCategory: jest.fn(),
  };

  let useCase: LoadCategoryAttributesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new LoadCategoryAttributesUseCase(
      mockCategoryAttributeRepository as any,
      mockCategoryRepository as any
    );
  });

  describe('execute', () => {
    it('should load category attributes', async () => {
      mockCategoryRepository.findById.mockResolvedValue({
        id: 'cat-1',
        name: 'Cooking Oil',
        slug: 'cooking-oil',
      });

      mockCategoryAttributeRepository.findByCategory.mockResolvedValue([
        {
          id: 'attr-1',
          name: 'volume',
          displayLabel: 'Volume',
          type: 'SELECT',
          isRequired: true,
          options: ['1L', '5L'],
        },
      ]);

      const result = await useCase.execute('cat-1');

      expect(result.categoryId).toBe('cat-1');
      expect(result.categoryName).toBe('Cooking Oil');
      expect(result.attributes).toHaveLength(1);
    });

    it('should throw on category not found', async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('invalid')).rejects.toThrow('Category not found');
    });

    it('should return empty attributes for category without attributes', async () => {
      mockCategoryRepository.findById.mockResolvedValue({
        id: 'cat-1',
        name: 'Category',
        slug: 'category',
      });

      mockCategoryAttributeRepository.findByCategory.mockResolvedValue([]);

      const result = await useCase.execute('cat-1');

      expect(result.attributes).toHaveLength(0);
    });

    it('should parse JSON options', async () => {
      mockCategoryRepository.findById.mockResolvedValue({
        id: 'cat-1',
        name: 'Category',
        slug: 'category',
      });

      mockCategoryAttributeRepository.findByCategory.mockResolvedValue([
        {
          id: 'attr-1',
          name: 'type',
          displayLabel: 'Type',
          type: 'SELECT',
          isRequired: true,
          options: JSON.stringify(['Option1', 'Option2']),
        },
      ]);

      const result = await useCase.execute('cat-1');

      expect(result.attributes[0].options).toEqual(['Option1', 'Option2']);
    });
  });
});
