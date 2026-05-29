import { AuthUserSyncInspector } from './auth-user-sync-inspector';

describe('AuthUserSyncInspector', () => {
  it('passes when user records are synchronized', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([]);

    const disconnectMock = jest.fn().mockResolvedValue(undefined);
    const inspector = new AuthUserSyncInspector('D1.1', () => ({
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
        id: 'D1.1',
        title: 'User Sync Integrity',
        category: 'Data Integrity',
        severity: 'P0',
        runner: 'database-query'
      }
    );

    expect(result.status).toBe('PASS');
    expect(result.summary).toContain('synchronized');
    expect(disconnectMock).toHaveBeenCalled();
  });
});

