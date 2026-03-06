import { ProductController } from '../product.controller';

describe('ProductController', () => {
  const mockCreateProductUseCase = { execute: jest.fn() };
  const mockGetProductUseCase = { execute: jest.fn() };
  const mockGetProductsBySellerUseCase = { execute: jest.fn() };
  const mockSearchProductsUseCase = { execute: jest.fn() };
  const mockProductMapper = {};
  const mockLoadCategoryAttributesUseCase = { execute: jest.fn() };
  const mockPreviewGeneratedDescriptionUseCase = { execute: jest.fn() };

  let controller: ProductController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProductController(
      mockCreateProductUseCase as any,
      mockGetProductUseCase as any,
      mockGetProductsBySellerUseCase as any,
      mockSearchProductsUseCase as any,
      mockProductMapper as any,
      mockLoadCategoryAttributesUseCase as any,
      mockPreviewGeneratedDescriptionUseCase as any
    );
  });

  describe('loadCategoryAttributes', () => {
    it('should load category attributes', async () => {
      mockLoadCategoryAttributesUseCase.execute.mockResolvedValue({
        categoryId: 'cat-1',
        categoryName: 'Cooking Oil',
        attributes: [],
      });

      const req = { params: { categoryId: 'cat-1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.loadCategoryAttributes(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 400 if categoryId missing', async () => {
      const req = { params: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.loadCategoryAttributes(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors', async () => {
      mockLoadCategoryAttributesUseCase.execute.mockRejectedValue(new Error('DB error'));

      const req = { params: { categoryId: 'cat-1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

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
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.previewGeneratedDescription(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid input', async () => {
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

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
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

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
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.createProduct(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for validation error', async () => {
      const req = { body: {}, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

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
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

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
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.createProduct(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getProduct', () => {
    it('should get product by id', async () => {
      mockGetProductUseCase.execute.mockResolvedValue({
        status: 'success',
        product: { id: 'prod-1', name: 'Oil' },
      });

      const req = { params: { id: 'prod-1' }, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.getProduct(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 for not found', async () => {
      mockGetProductUseCase.execute.mockResolvedValue({
        status: 'not_found',
      });

      const req = { params: { id: 'invalid' }, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

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

      const req = { params: { sellerId: 'seller-1' }, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.getProductsBySeller(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('searchProducts', () => {
    it('should search products', async () => {
      mockSearchProductsUseCase.execute.mockResolvedValue({
        status: 'success',
        results: [],
        total: 0,
        pagination: { page: 1, limit: 20, totalPages: 0 },
      });

      const req = { query: { q: 'oil' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.searchProducts(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
