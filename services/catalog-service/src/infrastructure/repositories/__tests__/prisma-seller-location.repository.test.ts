/**
 * PrismaSellerLocationRepository tests
 *
 * Covers the real persistence contract: catalog_SellerLocation.
 * Physical stock (inventory_stock_items) lives in inventory-service and is
 * covered by that module's own suite.
 */

import { PrismaSellerLocationRepository } from '../prisma-seller-location.repository';
import { SellerLocation } from '../../../domain/entities/seller-location.entity';

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

function createMockPrisma() {
  return {
    catalog_SellerLocation: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
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
});
