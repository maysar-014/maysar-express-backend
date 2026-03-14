const mockDelegate = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

jest.mock('../../config/database.config', () => ({
  databaseManager: {
    getPrisma: jest.fn(() => ({
      order_CODDispute: mockDelegate,
    })),
  },
}));

import { PrismaCODDisputeRepository } from './prisma-cod-dispute.repository';

describe('PrismaCODDisputeRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns mapped dispute on successful findById', async () => {
    mockDelegate.findUnique.mockResolvedValue({
      id: 'd1',
      orderId: 'o1',
      disputeType: 'COD_PROOF',
      raisedBy: 'buyer',
      description: 'missing item',
      status: 'PENDING',
      resolution: null,
      resolvedAt: null,
    });

    const repo = new PrismaCODDisputeRepository();
    await expect(repo.findById('d1')).resolves.toEqual({
      id: 'd1',
      orderId: 'o1',
      disputeType: 'COD_PROOF',
      raisedBy: 'buyer',
      description: 'missing item',
      status: 'PENDING',
      resolution: undefined,
      resolvedAt: undefined,
    });
  });

  it('returns null when dispute is not found', async () => {
    mockDelegate.findUnique.mockResolvedValue(null);

    const repo = new PrismaCODDisputeRepository();
    await expect(repo.findById('missing')).resolves.toBeNull();
  });

  it('returns null and logs when findById throws', async () => {
    const error = new Error('boom');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockDelegate.findUnique.mockRejectedValue(error);

    const repo = new PrismaCODDisputeRepository();
    await expect(repo.findById('d1')).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('Error finding COD dispute:', error);
  });

  it('save and update persist through prisma delegate', async () => {
    mockDelegate.create.mockResolvedValue({});
    mockDelegate.update.mockResolvedValue({});

    const repo = new PrismaCODDisputeRepository();
    const dispute = {
      id: 'd1',
      orderId: 'o1',
      disputeType: 'COD_PROOF',
      raisedBy: 'buyer',
      description: 'desc',
      status: 'PENDING' as const,
    };

    await expect(repo.save(dispute)).resolves.toBeUndefined();
    await expect(repo.update({ ...dispute, status: 'RESOLVED' as const })).resolves.toBeUndefined();

    expect(mockDelegate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: 'd1', orderId: 'o1', status: 'PENDING' }),
      })
    );

    expect(mockDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'd1' },
        data: expect.objectContaining({ status: 'RESOLVED' }),
      })
    );
  });
});
