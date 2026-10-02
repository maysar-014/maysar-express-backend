/**
 * PrismaSellerLocationRepository tests
 *
 * Covers the real persistence contract: catalog_SellerLocation / catalog_ProductLocation.
 * (The previous suite exercised a `findByIdForSeller` / `businessAddress` API that this
 * repository does not implement.)
 */

import { PrismaSellerLocationRepository } from '../prisma-seller-location.repository';
import { SellerLocation } from '../../../domain/entities/seller-location.entity';
import { ProductLocation } from '../../../domain/entities/product-location.entity';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({}))
}));

const CREATED_AT = new Date('2024-01-01T00:00:00.000Z');
const UPDATED_AT = new Date('2024-01-02T00:00:00.000Z');

function locationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'loc-1',
    sellerId: 'seller-1',
    name: 'Kariakoo Shop',
    type: 'SHOP',
    status: 'ACTIVE',
    street: 'Msimbazi Street',
    ward: 'Kariakoo',
    district: 'Ilala',
    region: 'Dar es Salaam',
    postalCode: '11101',
    country: 'Tanzania',
    latitude: -6.8,
    longitude: 39.28,
    isPrimary: true,
    isActive: true,
    operatingHours: { mon: '08:00-18:00' },
    notes: 'Gate 3',
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides
  };
}

function productLocationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pl-1',
    productId: 'prod-1',
    locationId: 'loc-1',
    sellerId: 'seller-1',
    quantityAvailable: 10,
    quantityReserved: 2,
    isAvailable: true,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides
  };
}

function createMockPrisma() {
  return {
    catalog_SellerLocation: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn()
    },
    catalog_ProductLocation: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn()
    }
  };
}

describe('PrismaSellerLocationRepository', () => {
  let repository: PrismaSellerLocationRepository;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    repository = new PrismaSellerLocationRepository(prisma as any);
  });

  describe('seller locations', () => {
    it('maps a catalog_SellerLocation row into the SellerLocation entity', async () => {
      prisma.catalog_SellerLocation.findUnique.mockResolvedValue(locationRow());

      const result = await repository.findById('loc-1');

      expect(prisma.catalog_SellerLocation.findUnique).toHaveBeenCalledWith({ where: { id: 'loc-1' } });
      expect(result).toBeInstanceOf(SellerLocation);
      expect(result).toMatchObject({
        id: 'loc-1',
        sellerId: 'seller-1',
        name: 'Kariakoo Shop',
        type: 'SHOP',
        status: 'ACTIVE',
        isPrimary: true,
        isActive: true,
        latitude: -6.8,
        longitude: 39.28
      });
      expect(result?.address).toEqual({
        street: 'Msimbazi Street',
        ward: 'Kariakoo',
        district: 'Ilala',
        region: 'Dar es Salaam',
        postalCode: '11101',
        country: 'Tanzania'
      });
      expect(result?.displayAddress).toBe('Msimbazi Street, Kariakoo, Ilala, Dar es Salaam, Tanzania');
    });

    it('returns null when the location does not exist', async () => {
      prisma.catalog_SellerLocation.findUnique.mockResolvedValue(null);

      await expect(repository.findById('missing')).resolves.toBeNull();
    });

    it('maps every location belonging to a seller', async () => {
      prisma.catalog_SellerLocation.findMany.mockResolvedValue([
        locationRow(),
        locationRow({
          id: 'loc-2',
          name: 'Kariakoo Warehouse',
          type: 'WAREHOUSE',
          isPrimary: false,
          ward: null,
          postalCode: null,
          notes: null,
          operatingHours: null
        })
      ]);

      const result = await repository.findBySeller('seller-1');

      expect(prisma.catalog_SellerLocation.findMany).toHaveBeenCalledWith({
        where: { sellerId: 'seller-1' },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }]
      });
      expect(result).toHaveLength(2);
      expect(result.map(location => location.id)).toEqual(['loc-1', 'loc-2']);
      expect(result[1].isPrimary).toBe(false);
      expect(result[1].address.ward).toBeUndefined();
      expect(result[1].address.postalCode).toBeUndefined();
      expect(result[1].notes).toBeUndefined();
      expect(result[1].operatingHours).toBeUndefined();
    });

    it('loads the active primary location for a seller', async () => {
      prisma.catalog_SellerLocation.findFirst.mockResolvedValue(locationRow());

      const result = await repository.findPrimaryForSeller('seller-1');

      expect(prisma.catalog_SellerLocation.findFirst).toHaveBeenCalledWith({
        where: { sellerId: 'seller-1', isPrimary: true, isActive: true }
      });
      expect(result?.id).toBe('loc-1');
    });

    it('returns null when the seller has no active primary location', async () => {
      prisma.catalog_SellerLocation.findFirst.mockResolvedValue(null);

      await expect(repository.findPrimaryForSeller('seller-1')).resolves.toBeNull();
    });

    it('clears the primary flag for every location of a seller', async () => {
      await repository.clearPrimaryForSeller('seller-1');

      expect(prisma.catalog_SellerLocation.updateMany).toHaveBeenCalledWith({
        where: { sellerId: 'seller-1', isPrimary: true },
        data: { isPrimary: false }
      });
    });

    it('deletes a location by id', async () => {
      await repository.delete('loc-1');

      expect(prisma.catalog_SellerLocation.delete).toHaveBeenCalledWith({ where: { id: 'loc-1' } });
    });
  });

  describe('product inventory per location', () => {
    it('upserts a product/location stock record keyed by productId_locationId', async () => {
      const record = new ProductLocation({
        id: 'pl-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        sellerId: 'seller-1',
        quantityAvailable: 12,
        quantityReserved: 3,
        isAvailable: true,
        createdAt: CREATED_AT,
        updatedAt: UPDATED_AT
      });

      await repository.saveProductLocation(record);

      expect(prisma.catalog_ProductLocation.upsert).toHaveBeenCalledTimes(1);
      const [[callArgs]] = prisma.catalog_ProductLocation.upsert.mock.calls;
      expect(callArgs.where).toEqual({
        productId_locationId: { productId: 'prod-1', locationId: 'loc-1' }
      });
      expect(callArgs.create).toEqual({
        id: 'pl-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        sellerId: 'seller-1',
        quantityAvailable: 12,
        quantityReserved: 3,
        isAvailable: true,
        createdAt: CREATED_AT,
        updatedAt: UPDATED_AT
      });
      expect(callArgs.update).toMatchObject({
        quantityAvailable: 12,
        quantityReserved: 3,
        isAvailable: true
      });
      expect(callArgs.update.updatedAt).toBeInstanceOf(Date);
    });

    it('maps a catalog_ProductLocation row into the ProductLocation entity', async () => {
      prisma.catalog_ProductLocation.findUnique.mockResolvedValue(productLocationRow());

      const result = await repository.findProductLocation('prod-1', 'loc-1');

      expect(prisma.catalog_ProductLocation.findUnique).toHaveBeenCalledWith({
        where: { productId_locationId: { productId: 'prod-1', locationId: 'loc-1' } }
      });
      expect(result).toBeInstanceOf(ProductLocation);
      expect(result?.netAvailable).toBe(8);
    });

    it('returns null when the product is not stocked at the location', async () => {
      prisma.catalog_ProductLocation.findUnique.mockResolvedValue(null);

      await expect(repository.findProductLocation('prod-1', 'loc-404')).resolves.toBeNull();
    });

    it('lists every location carrying a product, including the location record', async () => {
      prisma.catalog_ProductLocation.findMany.mockResolvedValue([productLocationRow()]);

      const result = await repository.findProductLocations('prod-1');

      expect(prisma.catalog_ProductLocation.findMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        include: { location: true },
        orderBy: { createdAt: 'asc' }
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ProductLocation);
      expect(result[0].netAvailable).toBe(8);
    });

    it('removes a product/location stock record', async () => {
      await repository.deleteProductLocation('prod-1', 'loc-1');

      expect(prisma.catalog_ProductLocation.delete).toHaveBeenCalledWith({
        where: { productId_locationId: { productId: 'prod-1', locationId: 'loc-1' } }
      });
    });

    it('returns in-stock locations sorted by distance from the buyer, keeping net availability', async () => {
      const buyerLat = -6.8;
      const buyerLng = 39.28;

      prisma.catalog_ProductLocation.findMany.mockResolvedValue([
        productLocationRow({
          id: 'pl-far',
          locationId: 'loc-far',
          quantityAvailable: 10,
          quantityReserved: 1,
          location: locationRow({ id: 'loc-far', name: 'Mbezi Depot', latitude: -6.7, longitude: 39.05 })
        }),
        productLocationRow({
          id: 'pl-near',
          locationId: 'loc-near',
          quantityAvailable: 5,
          quantityReserved: 2,
          location: locationRow({ id: 'loc-near', name: 'Upanga Shop', latitude: -6.81, longitude: 39.281 })
        }),
        productLocationRow({
          id: 'pl-fully-reserved',
          locationId: 'loc-reserved',
          quantityAvailable: 2,
          quantityReserved: 2,
          location: locationRow({ id: 'loc-reserved', name: 'Kariakoo Shop', latitude: -6.801, longitude: 39.281 })
        })
      ]);

      const result = await repository.findAvailableLocationsForProduct('prod-1', buyerLat, buyerLng);

      expect(prisma.catalog_ProductLocation.findMany).toHaveBeenCalledWith({
        where: {
          productId: 'prod-1',
          isAvailable: true,
          quantityAvailable: { gt: 0 },
          location: { isActive: true, status: 'ACTIVE' }
        },
        include: { location: true }
      });

      // Fully reserved stock is dropped even though it is the closest match.
      expect(result.map(entry => entry.id)).toEqual(['pl-near', 'pl-far']);
      expect(result[0].netAvailable).toBe(3);
      expect(result[1].netAvailable).toBe(9);
      expect(result[0].distanceKm).toBeLessThan(result[1].distanceKm);
      expect(result[0].location).toBeInstanceOf(SellerLocation);
      expect(result[0].location.name).toBe('Upanga Shop');
    });
  });
});
