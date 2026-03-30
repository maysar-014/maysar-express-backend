import app, { startServer, gracefulShutdown } from './main';

describe('Main Entry Point', () => {
  it('should start server', async () => {
    const listenSpy = jest.spyOn(app, 'listen').mockImplementation(((port: number, cb?: () => void) => {
      cb?.();
      return { close: jest.fn() } as never;
    }) as never);

    expect(() => startServer()).not.toThrow();
    expect(listenSpy).toHaveBeenCalled();
    listenSpy.mockRestore();
  });

  it('should handle graceful shutdown', async () => {
    const mockClose = jest.fn((cb: (error?: Error) => void) => cb());
    const server = { close: mockClose } as Parameters<typeof gracefulShutdown>[0];

    await gracefulShutdown(server);
    expect(mockClose).toHaveBeenCalled();
  });

  it('should handle shutdown errors', async () => {
    const mockClose = jest.fn((cb: (error?: Error) => void) => cb(new Error('Close failed')));
    const server = { close: mockClose } as Parameters<typeof gracefulShutdown>[0];

    await expect(gracefulShutdown(server)).rejects.toThrow('Close failed');
  });
});
