import { WalletLedgerInspector } from './wallet-ledger-inspector';

describe('WalletLedgerInspector', () => {
  it('fails when ledger continuity is broken', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([
        {
          walletId: 'wallet-1',
          transactionId: 'trx-1',
          previousAfter: '1000.00',
          balanceBefore: '900.00',
          balanceAfter: '800.00'
        }
      ]);

    const disconnectMock = jest.fn().mockResolvedValue(undefined);
    const inspector = new WalletLedgerInspector('FIN1.1', () => ({
      $queryRawUnsafe: queryMock,
      $disconnect: disconnectMock
    } as any));

    const result = await inspector.inspect(
      {
        targetBaseUrl: 'http://localhost:3000',
        rootDir: process.cwd(),
        reportDir: process.cwd(),
        constitutionPath: process.cwd()
      },
      {
        id: 'FIN1.1',
        title: 'Wallet Ledger Continuity',
        category: 'Financial',
        severity: 'P0',
        runner: 'database-query'
      }
    );

    expect(result.status).toBe('FAIL');
    expect(result.summary).toContain('ledger breaks');
    expect(disconnectMock).toHaveBeenCalled();
  });
});

