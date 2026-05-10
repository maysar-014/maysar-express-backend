import { PrismaClient } from '@prisma/client';
import { PrismaSellerLocationRepository } from '../prisma-seller-location.repository';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    businessAddress: {
      findFirst: jest.fn()
    }
  }))
}));

describe('PrismaSellerLocationRepository', () => {
  let repository: PrismaSellerLocationRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    repository = new PrismaSellerLocationRepository(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('finds a saved location owned by the seller and formats a display name', async () => {
    mockPrisma.businessAddress.findFirst.mockResolvedValue({
      id: 'addr-1',
      businessId: 'biz-1',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      country: 'Tanzania',
      isPrimary: true,
      business: {
        id: 'biz-1',
        ownerId: 'seller-1'
      }
    });

    const result = await repository.findByIdForSeller('addr-1', 'seller-1');

    expect(mockPrisma.businessAddress.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'addr-1',
        business: {
          ownerId: 'seller-1'
        }
      },
      include: {
        business: {
          select: {
            id: true,
            ownerId: true
          }
        }
      }
    });
    expect(result).toEqual({
      id: 'addr-1',
      sellerId: 'seller-1',
      businessId: 'biz-1',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      country: 'Tanzania',
      displayName: 'Dar es Salaam',
      isPrimary: true
    });
  });

  it('returns null when the location does not belong to the seller', async () => {
    mockPrisma.businessAddress.findFirst.mockResolvedValue(null);

    const result = await repository.findByIdForSeller('addr-404', 'seller-1');

    expect(result).toBeNull();
  });
});
