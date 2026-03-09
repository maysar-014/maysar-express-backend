import { GetWalletStatementUseCase } from './get-wallet-statement.use-case';

describe('GetWalletStatementUseCase', () => {
  it('loads transactions and applies date filtering', async () => {
    const txs = [
      { id: 't1', createdAt: new Date('2026-01-01T10:00:00.000Z') },
      { id: 't2', createdAt: new Date('2026-01-03T10:00:00.000Z') },
      { id: 't3', createdAt: new Date('2026-01-05T10:00:00.000Z') }
    ];
    const repo = {
      findByUserId: jest.fn().mockResolvedValue(txs)
    };
    const useCase = new GetWalletStatementUseCase(repo as never);

    const result = await useCase.execute({
      userId: 'u1',
      startDate: new Date('2026-01-02T00:00:00.000Z'),
      endDate: new Date('2026-01-04T23:59:59.000Z'),
      limit: 50
    });

    expect(repo.findByUserId).toHaveBeenCalledWith('u1', {
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    expect(result.transactions.map((t: any) => t.id)).toEqual(['t2']);
    expect(result.totalCount).toBe(1);
  });
});
