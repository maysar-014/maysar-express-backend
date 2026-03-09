import { PrismaBusinessRepository } from './prisma-business.repository';
import { Business } from '../../domain/entities/business.entity';
import { RegistrationNumber } from '../../domain/value-objects/registration-number.value-object';
import { TaxId } from '../../domain/value-objects/tax-id.value-object';
import { BusinessAddress } from '../../domain/value-objects/business-address.value-object';
import {
  BusinessType,
  BusinessStatus,
  VerificationStatus,
  ComplianceStatus
} from '../../domain/types/business.types';

const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../services/logger.service', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

type RawAddress = {
  id: string;
  type: string;
  street: string;
  city: string;
  region: string;
  postalCode: string | null;
  country: string;
  isPrimary: boolean;
};

type RawBusiness = {
  id: string;
  name: string;
  businessType: string;
  registrationNumber: string;
  taxId: string | null;
  status: string;
  verificationStatus: string;
  complianceStatus: string;
  ownerId: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phoneNumber: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  addresses: RawAddress[];
};

const createRawBusiness = (overrides: Partial<RawBusiness> = {}): RawBusiness => ({
  id: 'biz-1',
  name: 'Acme Ltd',
  businessType: BusinessType.CORPORATION,
  registrationNumber: 'TZ-DAR-12345',
  taxId: '123456789',
  status: BusinessStatus.ACTIVE,
  verificationStatus: VerificationStatus.VERIFIED,
  complianceStatus: ComplianceStatus.COMPLIANT,
  ownerId: 'owner-1',
  description: 'A company',
  industry: 'Retail',
  website: 'https://acme.test',
  email: 'info@acme.test',
  phoneNumber: '255700000001',
  verifiedAt: new Date('2026-01-10T00:00:00.000Z'),
  verifiedBy: 'verifier-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  addresses: [
    {
      id: 'addr-1',
      type: 'MAIN',
      street: 'Samora Ave',
      city: 'Dar',
      region: 'Dar es Salaam',
      postalCode: '11101',
      country: 'Tanzania',
      isPrimary: true
    }
  ],
  ...overrides
});

const createBusinessEntity = (addressIds: string[] = ['addr-1', 'addr-2']): Business => {
  const addresses = addressIds.map((id, index) =>
    BusinessAddress.create({
      id,
      type: index === 0 ? 'MAIN' : 'BRANCH',
      street: index === 0 ? 'Samora Ave' : 'Uhuru Street',
      city: 'Dar',
      region: 'Dar es Salaam',
      postalCode: '11101',
      country: 'Tanzania',
      isPrimary: index === 0
    })
  );

  return Business.register({
    id: 'biz-entity-1',
    name: 'Entity Business',
    businessType: BusinessType.CORPORATION,
    registrationNumber: RegistrationNumber.create('TZ-DAR-99999'),
    taxId: TaxId.create('123456789'),
    ownerId: 'owner-entity-1',
    addresses
  }).verify('auditor-1');
};

const createPrismaMock = () => {
  const business = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn()
  };

  const businessAddress = {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  };

  const prisma = {
    business,
    businessAddress,
    $transaction: jest.fn()
  };

  return prisma;
};

describe('PrismaBusinessRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findById maps persistence data to domain entity', async () => {
    const prisma = createPrismaMock();
    prisma.business.findUnique.mockResolvedValue(createRawBusiness());
    const repository = new PrismaBusinessRepository(prisma as never);

    const result = await repository.findById('biz-1');

    expect(prisma.business.findUnique).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      include: { addresses: true }
    });
    expect(result?.id).toBe('biz-1');
    expect(result?.registrationNumber.getValue()).toBe('TZ-DAR-12345');
    expect(result?.taxId?.getValue()).toBe('123456789');
    expect(result?.addresses[0]?.getStreet()).toBe('Samora Ave');
  });

  it('returns null when findById does not find record', async () => {
    const prisma = createPrismaMock();
    prisma.business.findUnique.mockResolvedValue(null);
    const repository = new PrismaBusinessRepository(prisma as never);

    const result = await repository.findById('missing');

    expect(result).toBeNull();
  });

  it('logs and rethrows on findByRegistrationNumber failure', async () => {
    const prisma = createPrismaMock();
    prisma.business.findUnique.mockRejectedValue(new Error('query failed'));
    const repository = new PrismaBusinessRepository(prisma as never);

    await expect(repository.findByRegistrationNumber('TZ-DAR-12345')).rejects.toThrow('query failed');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error finding business by registration number',
      expect.objectContaining({
        registrationNumber: 'TZ-DAR-12345',
        error: 'query failed'
      })
    );
  });

  it('supports findByTaxId and findByOwnerId query methods', async () => {
    const prisma = createPrismaMock();
    prisma.business.findFirst.mockResolvedValue(createRawBusiness({ id: 'biz-tax' }));
    prisma.business.findMany.mockResolvedValue([
      createRawBusiness({ id: 'biz-owner-1' }),
      createRawBusiness({ id: 'biz-owner-2' })
    ]);
    const repository = new PrismaBusinessRepository(prisma as never);

    const byTax = await repository.findByTaxId('123456789');
    const byOwner = await repository.findByOwnerId('owner-1');

    expect(byTax?.id).toBe('biz-tax');
    expect(byOwner).toHaveLength(2);
    expect(prisma.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: 'owner-1' },
        include: { addresses: true }
      })
    );
  });

  it('creates a business with mapped addresses', async () => {
    const prisma = createPrismaMock();
    const entity = createBusinessEntity(['addr-new-1']);
    prisma.business.create.mockResolvedValue(
      createRawBusiness({
        id: entity.id,
        registrationNumber: entity.registrationNumber.getValue(),
        taxId: entity.taxId?.getValue() ?? null,
        addresses: [
          {
            id: 'addr-new-1',
            type: 'MAIN',
            street: 'Samora Ave',
            city: 'Dar',
            region: 'Dar es Salaam',
            postalCode: '11101',
            country: 'Tanzania',
            isPrimary: true
          }
        ]
      })
    );
    const repository = new PrismaBusinessRepository(prisma as never);

    const created = await repository.create(entity);

    expect(prisma.business.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: entity.id,
          registrationNumber: 'TZ-DAR-99999',
          addresses: expect.objectContaining({
            create: expect.any(Array)
          })
        }),
        include: { addresses: true }
      })
    );
    expect(created.id).toBe(entity.id);
  });

  it('updates business and synchronizes address set within transaction', async () => {
    const prisma = createPrismaMock();
    const entity = createBusinessEntity(['addr-1', 'addr-2']);

    const tx = {
      business: {
        update: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue(
          createRawBusiness({
            id: entity.id,
            registrationNumber: entity.registrationNumber.getValue(),
            taxId: entity.taxId?.getValue() ?? null,
            addresses: [
              {
                id: 'addr-1',
                type: 'MAIN',
                street: 'Samora Ave',
                city: 'Dar',
                region: 'Dar es Salaam',
                postalCode: '11101',
                country: 'Tanzania',
                isPrimary: true
              },
              {
                id: 'addr-2',
                type: 'BRANCH',
                street: 'Uhuru Street',
                city: 'Dar',
                region: 'Dar es Salaam',
                postalCode: '11101',
                country: 'Tanzania',
                isPrimary: false
              }
            ]
          })
        )
      },
      businessAddress: {
        findMany: jest.fn().mockResolvedValue([{ id: 'addr-1' }, { id: 'addr-old' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({})
      }
    };

    prisma.$transaction.mockImplementation(async (fn: (transaction: typeof tx) => unknown) => fn(tx));
    const repository = new PrismaBusinessRepository(prisma as never);

    const updated = await repository.update(entity);

    expect(tx.business.update).toHaveBeenCalled();
    expect(tx.businessAddress.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['addr-old'] }, businessId: entity.id }
    });
    expect(tx.businessAddress.update).toHaveBeenCalled();
    expect(tx.businessAddress.create).toHaveBeenCalled();
    expect(updated.id).toBe(entity.id);
  });

  it('throws when update transaction cannot load updated record', async () => {
    const prisma = createPrismaMock();
    const entity = createBusinessEntity();

    const tx = {
      business: {
        update: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue(null)
      },
      businessAddress: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
        create: jest.fn()
      }
    };

    prisma.$transaction.mockImplementation(async (fn: (transaction: typeof tx) => unknown) => fn(tx));
    const repository = new PrismaBusinessRepository(prisma as never);

    await expect(repository.update(entity)).rejects.toThrow(`Business ${entity.id} not found after update`);
  });

  it('deletes business and logs success', async () => {
    const prisma = createPrismaMock();
    prisma.business.delete.mockResolvedValue({});
    const repository = new PrismaBusinessRepository(prisma as never);

    await repository.delete('biz-delete-1');

    expect(prisma.business.delete).toHaveBeenCalledWith({ where: { id: 'biz-delete-1' } });
    expect(mockLoggerInfo).toHaveBeenCalledWith('Business deleted successfully', { businessId: 'biz-delete-1' });
  });

  it('supports search/findAll/count/findByStatus/findByVerificationStatus', async () => {
    const prisma = createPrismaMock();
    prisma.business.findMany.mockResolvedValue([
      createRawBusiness({ id: 'biz-100' }),
      createRawBusiness({ id: 'biz-101' })
    ]);
    prisma.business.count.mockResolvedValue(7);
    const repository = new PrismaBusinessRepository(prisma as never);

    const searchResults = await repository.search('acme', 10, 5);
    const allResults = await repository.findAll(20, 0);
    const count = await repository.count();
    const byStatus = await repository.findByStatus(BusinessStatus.ACTIVE);
    const byVerification = await repository.findByVerificationStatus(VerificationStatus.VERIFIED);

    expect(searchResults).toHaveLength(2);
    expect(allResults).toHaveLength(2);
    expect(count).toBe(7);
    expect(byStatus).toHaveLength(2);
    expect(byVerification).toHaveLength(2);
  });

  it('updates status and verification status fields', async () => {
    const prisma = createPrismaMock();
    prisma.business.update.mockResolvedValue({});
    const repository = new PrismaBusinessRepository(prisma as never);

    await repository.updateStatus('biz-1', BusinessStatus.SUSPENDED);
    await repository.updateVerificationStatus('biz-1', VerificationStatus.VERIFIED, 'auditor-1');

    expect(prisma.business.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'biz-1' },
        data: { status: BusinessStatus.SUSPENDED }
      })
    );
    expect(prisma.business.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'biz-1' },
        data: expect.objectContaining({
          verificationStatus: VerificationStatus.VERIFIED,
          verifiedBy: 'auditor-1',
          verifiedAt: expect.any(Date)
        })
      })
    );
  });

  it('builds business statistics from grouped counts', async () => {
    const prisma = createPrismaMock();
    prisma.business.count.mockResolvedValue(5);
    prisma.business.groupBy
      .mockResolvedValueOnce([
        { status: BusinessStatus.ACTIVE, _count: { status: 3 } },
        { status: BusinessStatus.SUSPENDED, _count: { status: 2 } }
      ])
      .mockResolvedValueOnce([
        { verificationStatus: VerificationStatus.VERIFIED, _count: { verificationStatus: 4 } },
        { verificationStatus: VerificationStatus.UNVERIFIED, _count: { verificationStatus: 1 } }
      ]);
    const repository = new PrismaBusinessRepository(prisma as never);

    const stats = await repository.getBusinessStatistics();

    expect(stats).toEqual({
      total: 5,
      byStatus: {
        [BusinessStatus.ACTIVE]: 3,
        [BusinessStatus.SUSPENDED]: 2
      },
      byVerificationStatus: {
        [VerificationStatus.VERIFIED]: 4,
        [VerificationStatus.UNVERIFIED]: 1
      }
    });
  });

  it('bulkUpdateStatus accumulates successes and failures', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaBusinessRepository(prisma as never);
    const updateSpy = jest.spyOn(repository, 'updateStatus');
    updateSpy
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('permission denied'))
      .mockResolvedValueOnce(undefined);

    const result = await repository.bulkUpdateStatus(
      ['biz-a', 'biz-b', 'biz-c'],
      BusinessStatus.DEACTIVATED
    );

    expect(result).toEqual({
      successCount: 2,
      failures: [{ id: 'biz-b', error: 'permission denied' }]
    });
  });
});
