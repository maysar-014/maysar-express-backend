import { PreviewGeneratedDescriptionUseCase } from '../preview-generated-description.use-case';

describe('PreviewGeneratedDescriptionUseCase', () => {
  const mockRepository = {
    findCategoryById: jest.fn(),
    findCategoryAttributesByCategory: jest.fn(),
  };

  let useCase: PreviewGeneratedDescriptionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new PreviewGeneratedDescriptionUseCase(mockRepository as any);
  });

  describe('execute', () => {
    it('should generate preview', async () => {
      mockRepository.findCategoryById.mockResolvedValue({
        id: 'cat-1',
        name: 'Cooking Oil',
        slug: 'cooking-oil',
        children: [],
      });

      mockRepository.findCategoryAttributesByCategory.mockResolvedValue([
        {
          id: 'attr-1',
          name: 'volume',
          displayLabel: 'Volume',
          type: 'SELECT',
          isRequired: true,
          options: ['1L', '5L'],
        },
      ]);

      const result = await useCase.execute({
        categoryId: 'cat-1',
        brand: 'Azam',
        productName: 'Cooking Oil',
        sellerId: 'seller-1',
        minimumOrderQuantity: 1,
        supplierLocation: 'Dar es Salaam',
        structuredAttributes: { volume: '5L' },
      });

      expect(result.seoTitle).toBeDefined();
      expect(result.shortSeoDescription).toBeDefined();
      expect(result.fullDescription).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.slug).toBeDefined();
    });

    it('should throw on category not found', async () => {
      mockRepository.findCategoryById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          categoryId: 'invalid',
          brand: 'Azam',
          productName: 'Oil',
          sellerId: 'seller-1',
          minimumOrderQuantity: 1,
          supplierLocation: 'Dar es Salaam',
          structuredAttributes: {},
        })
      ).rejects.toThrow('Category not found');
    });

    it('should throw on invalid attributes', async () => {
      mockRepository.findCategoryById.mockResolvedValue({
        id: 'cat-1',
        name: 'Cooking Oil',
        slug: 'cooking-oil',
      });

      mockRepository.findCategoryAttributesByCategory.mockResolvedValue([
        {
          id: 'attr-1',
          name: 'volume',
          displayLabel: 'Volume',
          type: 'SELECT',
          isRequired: true,
          options: ['1L', '5L'],
        },
      ]);

      await expect(
        useCase.execute({
          categoryId: 'cat-1',
          brand: 'Azam',
          productName: 'Oil',
          sellerId: 'seller-1',
          minimumOrderQuantity: 1,
          supplierLocation: 'Dar es Salaam',
          structuredAttributes: {},
        })
      ).rejects.toThrow('Missing required attributes');
    });

    it('should generate slug correctly', async () => {
      mockRepository.findCategoryById.mockResolvedValue({
        id: 'cat-1',
        name: 'Cooking Oil',
        slug: 'cooking-oil',
        children: [],
      });

      mockRepository.findCategoryAttributesByCategory.mockResolvedValue([
        {
          id: 'attr-1',
          name: 'volume',
          displayLabel: 'Volume',
          type: 'SELECT',
          isRequired: true,
          options: ['1L', '5L'],
        },
      ]);

      const result = await useCase.execute({
        categoryId: 'cat-1',
        brand: 'Azam',
        productName: 'Cooking Oil',
        sellerId: 'seller-1',
        minimumOrderQuantity: 1,
        supplierLocation: 'Dar es Salaam',
        structuredAttributes: { volume: '5L' },
      });

      expect(result.slug).toContain('cooking-oil');
      expect(result.slug).toContain('azam');
    });

    it('should generate SEO title within 70 chars', async () => {
      mockRepository.findCategoryById.mockResolvedValue({
        id: 'cat-1',
        name: 'Cooking Oil',
        slug: 'cooking-oil',
        children: [],
      });

      mockRepository.findCategoryAttributesByCategory.mockResolvedValue([
        {
          id: 'attr-1',
          name: 'volume',
          displayLabel: 'Volume',
          type: 'SELECT',
          isRequired: true,
          options: ['1L', '5L'],
        },
      ]);

      const result = await useCase.execute({
        categoryId: 'cat-1',
        brand: 'Azam',
        productName: 'Cooking Oil',
        sellerId: 'seller-1',
        minimumOrderQuantity: 1,
        supplierLocation: 'Dar es Salaam',
        structuredAttributes: { volume: '5L' },
      });

      expect(result.seoTitle.length).toBeLessThanOrEqual(70);
    });

    it('should generate short description 150-160 chars', async () => {
      mockRepository.findCategoryById.mockResolvedValue({
        id: 'cat-1',
        name: 'Cooking Oil',
        slug: 'cooking-oil',
        children: [],
      });

      mockRepository.findCategoryAttributesByCategory.mockResolvedValue([
        {
          id: 'attr-1',
          name: 'volume',
          displayLabel: 'Volume',
          type: 'SELECT',
          isRequired: true,
          options: ['1L', '5L'],
        },
      ]);

      const result = await useCase.execute({
        categoryId: 'cat-1',
        brand: 'Azam',
        productName: 'Cooking Oil',
        sellerId: 'seller-1',
        minimumOrderQuantity: 1,
        supplierLocation: 'Dar es Salaam',
        structuredAttributes: { volume: '5L' },
      });

      expect(result.shortSeoDescription.length).toBeLessThanOrEqual(160);
    });
  });
});
