import { Hold, HoldStatus } from '../../domain/entities/hold.entity';
import { Money } from '../../domain/value-objects/money.value-object';
import type { IHoldRepository } from '../../domain/repositories/hold.repository';
import { HoldRepository } from './hold.repository';

const createHold = (id: string): Hold =>
  new Hold({
    id,
    walletId: 'wallet-1',
    userId: 'user-1',
    amount: Money.fromMinor(1500, 'TZS'),
    reason: 'reserve funds',
    status: HoldStatus.ACTIVE,
    expiresAt: new Date('2026-12-01T00:00:00.000Z'),
    isCaptured: false,
    isReleased: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });

const createPrismaMock = () => ({
  wallet_Hold: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn()
  }
});

describe('HoldRepository', () => {
  it('satisfies the domain hold repository contract', () => {
    const prismaMock = createPrismaMock();
    const repository: IHoldRepository = new HoldRepository(prismaMock as never);

    expect(repository).toBeInstanceOf(HoldRepository);
  });

  it('persists hold entries with mapped fields', async () => {
    const prismaMock = createPrismaMock();
    const repository = new HoldRepository(prismaMock as never);
    const hold = createHold('hold-1');

    await repository.save(hold);

    expect(prismaMock.wallet_Hold.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'hold-1' },
        create: expect.objectContaining({
          id: 'hold-1',
          walletId: 'wallet-1',
          amount: 15,
          status: 'ACTIVE'
        }),
        update: expect.objectContaining({
          id: 'hold-1',
          walletId: 'wallet-1',
          amount: 15
        })
      })
    );
  });

  it('maps persistence records to domain entities for lookups', async () => {
    const prismaMock = createPrismaMock();
    const repository = new HoldRepository(prismaMock as never);

    const dbRecord = {
      id: 'hold-2',
      walletId: 'wallet-1',
      userId: 'user-1',
      amount: 10,
      currency: 'TZS',
      reason: 'reserve funds',
      status: 'ACTIVE',
      expiresAt: new Date('2026-12-01T00:00:00.000Z'),
      isCaptured: false,
      isReleased: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      metadata: { source: 'test' }
    };

    prismaMock.wallet_Hold.findUnique.mockResolvedValueOnce(dbRecord);
    prismaMock.wallet_Hold.findMany.mockResolvedValue([dbRecord]);

    const byId = await repository.findById('hold-2');
    const active = await repository.findActiveByWalletId('wallet-1');
    const expired = await repository.findExpired(10);

    expect(byId?.id).toBe('hold-2');
    expect(byId?.amount.amount).toBe(1000);
    expect(active).toHaveLength(1);
    expect(expired).toHaveLength(1);
  });
});
