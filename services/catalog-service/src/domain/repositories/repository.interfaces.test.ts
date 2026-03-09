import type {
  IMatchConfirmationRepository,
  IProductMatchAuditRepository,
  IProductRepository
} from './repository.interfaces';

describe('repository.interfaces contracts', () => {
  it('accepts implementations that satisfy repository interfaces', async () => {
    const productRepo: IProductRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findByIdentifiers: jest.fn().mockResolvedValue([]),
      findByFingerprint: jest.fn().mockResolvedValue([]),
      findByCategoryAndBrand: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const auditRepo: IProductMatchAuditRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
      findBySeller: jest.fn().mockResolvedValue([]),
      findByMatchLevel: jest.fn().mockResolvedValue([])
    };
    const confirmationRepo: IMatchConfirmationRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
      findPendingBySeller: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      findExpired: jest.fn().mockResolvedValue([])
    };

    await expect(productRepo.findById('p1')).resolves.toBeNull();
    await expect(auditRepo.findBySeller('seller-1')).resolves.toEqual([]);
    await expect(confirmationRepo.findExpired()).resolves.toEqual([]);
  });
});

