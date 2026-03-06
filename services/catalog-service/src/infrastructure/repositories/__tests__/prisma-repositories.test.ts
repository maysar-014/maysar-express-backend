import { PrismaCategoryAttributeRepository } from '../prisma-category-attribute.repository';
import { PrismaProductAttributeRepository } from '../prisma-product-attribute.repository';

describe('PrismaCategoryAttributeRepository', () => {
  const mockPrisma = {
    categoryAttribute: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  let repository: PrismaCategoryAttributeRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PrismaCategoryAttributeRepository(mockPrisma as any);
  });

  describe('findByCategory', () => {
    it('should find attributes by category', async () => {
      mockPrisma.categoryAttribute.findMany.mockResolvedValue([
        { id: 'attr-1', name: 'volume', displayLabel: 'Volume' },
      ]);

      const result = await repository.findByCategory('cat-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.categoryAttribute.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat-1' },
        orderBy: { displayOrder: 'asc' },
      });
    });

    it('should return empty array for category without attributes', async () => {
      mockPrisma.categoryAttribute.findMany.mockResolvedValue([]);

      const result = await repository.findByCategory('cat-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should find attribute by id', async () => {
      mockPrisma.categoryAttribute.findUnique.mockResolvedValue({
        id: 'attr-1',
        name: 'volume',
      });

      const result = await repository.findById('attr-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('attr-1');
    });

    it('should return null for non-existent attribute', async () => {
      mockPrisma.categoryAttribute.findUnique.mockResolvedValue(null);

      const result = await repository.findById('invalid');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should save attribute', async () => {
      mockPrisma.categoryAttribute.upsert.mockResolvedValue({
        id: 'attr-1',
        name: 'volume',
      });

      await repository.save({
        id: 'attr-1',
        categoryId: 'cat-1',
        name: 'volume',
        displayLabel: 'Volume',
        type: 'SELECT',
        isRequired: true,
      });

      expect(mockPrisma.categoryAttribute.upsert).toHaveBeenCalled();
    });
  });
});

describe('PrismaProductAttributeRepository', () => {
  const mockPrisma = {
    productAttribute: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  let repository: PrismaProductAttributeRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PrismaProductAttributeRepository(mockPrisma as any);
  });

  describe('saveAll', () => {
    it('should save all attributes', async () => {
      mockPrisma.productAttribute.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.productAttribute.createMany.mockResolvedValue({ count: 2 });

      await repository.saveAll('prod-1', [
        { attributeId: 'attr-1', value: '5L' },
        { attributeId: 'attr-2', value: 'Vegetable' },
      ]);

      expect(mockPrisma.productAttribute.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.productAttribute.createMany).toHaveBeenCalled();
    });

    it('should handle empty attributes', async () => {
      await repository.saveAll('prod-1', []);

      expect(mockPrisma.productAttribute.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('findByProduct', () => {
    it('should find attributes by product', async () => {
      mockPrisma.productAttribute.findMany.mockResolvedValue([
        { id: 'pa-1', productId: 'prod-1', attributeId: 'attr-1', value: '5L' },
      ]);

      const result = await repository.findByProduct('prod-1');

      expect(result).toHaveLength(1);
    });

    it('should return empty array for product without attributes', async () => {
      mockPrisma.productAttribute.findMany.mockResolvedValue([]);

      const result = await repository.findByProduct('prod-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteByProduct', () => {
    it('should delete all attributes for product', async () => {
      mockPrisma.productAttribute.deleteMany.mockResolvedValue({ count: 2 });

      const result = await repository.deleteByProduct('prod-1');

      expect(result).toBe(2);
    });
  });
});
