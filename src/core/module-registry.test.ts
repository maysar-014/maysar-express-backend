jest.mock('../../shared/logger/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }))
}));

import { createLogger } from '../../shared/logger/logger';
import { ModuleRegistry } from './module-registry';

describe('ModuleRegistry', () => {
  // The registry logger is created once when module-registry is imported
  // (module scope), so its mock result is snapshotted here - jest.clearAllMocks()
  // in beforeEach wipes mock.results and would make getLogger() undefined.
  const createdLogger = (createLogger as jest.Mock).mock.results[0]?.value as {
    info: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
  };
  const getLogger = () => createdLogger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers modules and returns them via getModules', () => {
    const registry = new ModuleRegistry();
    const moduleA = {
      name: 'A',
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined)
    };

    registry.register(moduleA);

    expect(registry.getModules()).toEqual([moduleA]);
    expect(getLogger().info).toHaveBeenCalledWith('Registering module: A');
  });

  it('initializes all modules in registration order', async () => {
    const registry = new ModuleRegistry();
    const calls: string[] = [];
    const moduleA = { name: 'A', initialize: jest.fn(async () => { calls.push('A'); }) };
    const moduleB = { name: 'B', initialize: jest.fn(async () => { calls.push('B'); }) };
    registry.register(moduleA);
    registry.register(moduleB);

    await registry.initializeAll();

    expect(calls).toEqual(['A', 'B']);
    expect(getLogger().info).toHaveBeenCalledWith('Initializing 2 modules in parallel...');
    expect(getLogger().info).toHaveBeenCalledWith('Initializing A...');
    expect(getLogger().info).toHaveBeenCalledWith('Initializing B...');
  });

  it('aggregates initialization failures, logs the reason, and rethrows', async () => {
    const registry = new ModuleRegistry();
    const failure = new Error('init failed');
    const moduleA = { name: 'A', initialize: jest.fn().mockRejectedValue(failure) };
    registry.register(moduleA);

    await expect(registry.initializeAll()).rejects.toThrow(
      'Failed to initialize modules: A'
    );
    expect(getLogger().error).toHaveBeenCalledWith(
      'Failed to initialize module A:',
      failure
    );
  });

  it('shuts down modules in reverse order and swallows shutdown errors', async () => {
    const registry = new ModuleRegistry();
    const calls: string[] = [];
    const moduleA = {
      name: 'A',
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn(async () => { calls.push('A'); })
    };
    const moduleBFailure = new Error('shutdown failed');
    const moduleB = {
      name: 'B',
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockRejectedValue(moduleBFailure)
    };
    const moduleC = {
      name: 'C',
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn(async () => { calls.push('C'); })
    };
    registry.register(moduleA);
    registry.register(moduleB);
    registry.register(moduleC);

    await registry.shutdownAll();

    expect(calls).toEqual(['C', 'A']);
    expect(getLogger().error).toHaveBeenCalledWith(
      'Error shutting down module B:',
      moduleBFailure
    );
  });
});
