import express from 'express';
import { startServer, gracefulShutdown } from './main';

describe('Main Entry Point', () => {
  it('should start server', async () => {
    const mockListen = jest.fn((port, cb) => cb());
    jest.spyOn(express(), 'listen').mockImplementation(mockListen);
    
    await expect(startServer()).resolves.not.toThrow();
  });

  it('should handle graceful shutdown', async () => {
    const mockClose = jest.fn((cb) => cb());
    const server = { close: mockClose } as unknown as { close: (cb: () => void) => void };
    
    await gracefulShutdown(server as never);
    expect(mockClose).toHaveBeenCalled();
  });

  it('should handle shutdown errors', async () => {
    const mockClose = jest.fn((cb) => cb(new Error('Close failed')));
    const server = { close: mockClose } as unknown as { close: (cb: (err?: Error) => void) => void };
    
    await expect(gracefulShutdown(server as never)).rejects.toThrow();
  });
});
