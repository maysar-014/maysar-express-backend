import { ProductController } from '../product.controller';

describe('ProductController', () => {
  const mockCreateProductUseCase = { execute: jest.fn() };
  const mockGetProductUseCase = { execute: jest.fn() };
  const mockGetProductsBySellerUseCase = { execute: jest.fn() };
  const mockSearchProductsUseCase = { execute: jest.fn() };
  const mockProductMapper = {};
  const mockLoadCategoryAttributesUseCase = { execute: jest.fn() };
  const mockPreviewGeneratedDescriptionUseCase = { execute: jest.fn() };
  const mockListCategoriesUseCase = { execute: jest.fn() };
  const mockCreateCategoryUseCase = { execute: jest.fn() };
  const mockUpdateCategoryUseCase = { execute: jest.fn() };
  const mockDeleteCategoryUseCase = { execute: jest.fn() };

  let controller: ProductController;

  const makeReq = (overrides: Record<string, any> = {}) => ({
    params: {},
    query: {},
    body: {},
    ...overrides,
    headers: {
      'x-request-id': 'test-request-id',
      ...(overrides.headers || {}),
    },
  });

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProductController(
      mockCreateProductUseCase as any,
      mockGetProductUseCase as any,
      mockGetProductsBySellerUseCase as any,
      mockSearchProductsUseCase as any,
      mockProductMapper as any,
      mockLoadCategoryAttributesUseCase as any,
      mockPreviewGeneratedDescriptionUseCase as any,
      undefined,
      mockListCategoriesUseCase as any,
      mockCreateCategoryUseCase as any,
      mockUpdateCategoryUseCase as any,
      mockDeleteCategoryUseCase as any
    );
  });

  describe('listCategories', () => {
    it('should list categories', async () => {
      mockListCategoriesUseCase.execute.mockResolvedValue([
        { id: 'cat-1', label: 'Electronics', icon: 'icon.png' }
      ]);

      const req = makeReq();
      const res = makeRes();

      await controller.listCategories(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: [{ id: 'cat-1', label: 'Electronics', icon: 'icon.png' }]
      }));
    });
  });

  describe('createCategory', () => {
    it('should create category', async () => {
      mockCreateCategoryUseCase.execute.mockResolvedValue({
        id: 'cat-1',
        label: 'Electronics',
        icon: 'icon.png',
        slug: 'electronics',
        description: null,
        parentId: null,
        displayOrder: 0,
        isActive: true,
      });

      const req = makeReq({ body: { label: 'Electronics', icon: 'icon.png' } });
      const res = makeRes();

      await controller.createCategory(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateCategory', () => {
    it('should update category', async () => {
      mockUpdateCategoryUseCase.execute.mockResolvedValue({
        id: 'cat-1',
        label: 'Updated',
        icon: null,
        slug: 'updated',
        description: null,
        parentId: null,
        displayOrder: 0,
        isActive: true,
      });

      const req = makeReq({ params: { id: 'cat-1' }, body: { label: 'Updated' } });
      const res = makeRes();

      await controller.updateCategory(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category', async () => {
      mockDeleteCategoryUseCase.execute.mockResolvedValue({
        categoryId: 'cat-1',
        deleted: true,
      });

      const req = makeReq({ params: { id: 'cat-1' } });
      const res = makeRes();

      await controller.deleteCategory(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('loadCategoryAttributes', () => {
    it('should load category attributes', async () => {
      mockLoadCategoryAttributesUseCase.execute.mockResolvedValue({
        categoryId: 'cat-1',
        categoryName: 'Cooking Oil',
        attributes: [],
      });

      const req = makeReq({ params: { categoryId: 'cat-1' } });
      const res = makeRes();

      await controller.loadCategoryAttributes(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 400 if categoryId missing', async () => {
      const req = makeReq({ params: {} });
      const res = makeRes();

      await controller.loadCategoryAttributes(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors', async () => {
      mockLoadCategoryAttributesUseCase.execute.mockRejectedValue(new Error('DB error'));

      const req = makeReq({ params: { categoryId: 'cat-1' } });
      const res = makeRes();

      await controller.loadCategoryAttributes(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('previewGeneratedDescription', () => {
    it('should preview description', async () => {
      mockPreviewGeneratedDescriptionUseCase.execute.mockResolvedValue({
        seoTitle: 'Title',
        shortSeoDescription: 'Description',
        qualityScore: 75,
        slug: 'slug',
      });

      const req = {
        body: {
          categoryId: 'cat-1',
          brand: 'Azam',
          productName: 'Oil',
          structuredAttributes: {},
        },
      };
      const res = makeRes();

      await controller.previewGeneratedDescription(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid input', async () => {
      const req = makeReq({ body: {} });
      const res = makeRes();

      await controller.previewGeneratedDescription(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors', async () => {
      mockPreviewGeneratedDescriptionUseCase.execute.mockRejectedValue(new Error('Error'));

      const req = {
        body: {
          categoryId: 'cat-1',
          brand: 'Azam',
          productName: 'Oil',
          structuredAttributes: {},
        },
      };
      const res = makeRes();

      await controller.previewGeneratedDescription(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createProduct', () => {
    it('should create product successfully', async () => {
      mockCreateProductUseCase.execute.mockResolvedValue({
        status: 'success',
        productId: 'prod-1',
      });

      const req = {
        body: {
          sellerId: 'seller-1',
          categoryId: 'cat-1',
          brand: 'Azam',
          productName: 'Oil',
          minimumOrderQuantity: 10,
          supplierLocation: 'Dar es Salaam',
          structuredAttributes: { volume: '5L' },
          mediaUrls: ['url'],
          price: 15000,
        },
        query: {},
      };
      const res = makeRes();

      await controller.createProduct(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for validation error', async () => {
      const req = makeReq({ body: {}, query: {} });
      const res = makeRes();

      await controller.createProduct(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 409 for business rule violation', async () => {
      mockCreateProductUseCase.execute.mockResolvedValue({
        status: 'business_rule_violation',
        message: 'Quality score too low',
      });

      const req = {
        body: {
          sellerId: 'seller-1',
          categoryId: 'cat-1',
          brand: 'Azam',
          productName: 'Oil',
          minimumOrderQuantity: 10,
          supplierLocation: 'Dar es Salaam',
          structuredAttributes: { volume: '5L' },
          mediaUrls: ['url'],
          price: 15000,
        },
        query: {},
      };
      const res = makeRes();

      await controller.createProduct(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should handle errors', async () => {
      mockCreateProductUseCase.execute.mockRejectedValue(new Error('Error'));

      const req = {
        body: {
          sellerId: 'seller-1',
          categoryId: 'cat-1',
          brand: 'Azam',
          productName: 'Oil',
          minimumOrderQuantity: 10,
          supplierLocation: 'Dar es Salaam',
          structuredAttributes: { volume: '5L' },
          mediaUrls: ['url'],
          price: 15000,
        },
        query: {},
      };
      const res = makeRes();

      await controller.createProduct(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getProduct', () => {
    it('should get product by id', async () => {
      mockGetProductUseCase.execute.mockResolvedValue({
        status: 'success',
        product: {
          id: 'prod-1',
          sellerId: 'seller-1',
          sellerName: 'Seller One',
          name: 'Oil',
          description: 'Premium cooking oil',
          price: 15000,
          categoryId: 'cat-1',
          categoryName: 'Cooking Oil',
          categoryPath: ['Food', 'Cooking Oil'],
          type: 'simple',
          tags: ['oil'],
          attributes: { volume: '5L' },
          status: 'active',
          media: [],
          inventory: { available: 0, reserved: 0, total: 0, status: 'out_of_stock' },
          shipping: {},
          seo: {},
          analytics: {},
          ratings: {},
          reviews: [],
          recommendations: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const req = makeReq({ params: { id: 'prod-1' }, query: {} });
      const res = makeRes();

      await controller.getProduct(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 for not found', async () => {
      mockGetProductUseCase.execute.mockResolvedValue({
        status: 'not_found',
      });

      const req = makeReq({ params: { id: 'invalid' }, query: {} });
      const res = makeRes();

      await controller.getProduct(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getProductsBySeller', () => {
    it('should get products by seller', async () => {
      mockGetProductsBySellerUseCase.execute.mockResolvedValue({
        status: 'success',
        products: [],
        total: 0,
      });

      const req = makeReq({ params: { sellerId: 'seller-1' }, query: {} });
      const res = makeRes();

      await controller.getProductsBySeller(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('searchProducts', () => {
    it('should search products', async () => {
      mockSearchProductsUseCase.execute.mockResolvedValue({
        status: 'success',
        results: [
          {
            id: 'product-1',
            name: 'Azam Sunflower Cooking Oil 5L',
            price: { amount: 19800, currency: 'TZS' },
            categoryId: 'category-1',
            sellerId: 'seller-1',
            type: 'physical',
            tags: ['cod-available'],
            status: 'published',
            mediaUrls: ['https://images.example.com/azam-oil.jpg'],
            thumbnailUrl: 'https://images.example.com/azam-oil-thumb.jpg',
            createdAt: new Date('2026-04-22T19:40:35.904Z')
          }
        ],
        total: 1,
        pagination: { page: 1, limit: 20, totalPages: 1, hasNext: false, hasPrev: false },
        searchMetadata: { query: 'oil', executionTime: 12, totalResults: 1 },
        facets: { categories: [], priceRanges: [], productTypes: [], tags: [] },
      });

      const req = makeReq({ query: { q: 'oil' } });
      const res = makeRes();

      await controller.searchProducts(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              thumbnailUrl: 'https://images.example.com/azam-oil-thumb.jpg'
            })
          ]
        })
      );
    });
  });
});
