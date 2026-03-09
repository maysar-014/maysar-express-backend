import { Router } from 'express';
import type { Module, ServiceModule } from '../src/core/module.interface';

describe('Module interface contract', () => {
  it('supports initialization and optional routes/shutdown hooks', async () => {
    const initialize = jest.fn(async () => undefined);
    const shutdown = jest.fn(async () => undefined);

    const moduleDef: Module = {
      name: 'sample-module',
      initialize,
      routes: Router(),
      shutdown
    };
    const alias: ServiceModule = moduleDef;

    await alias.initialize();
    await alias.shutdown?.();

    expect(alias.name).toBe('sample-module');
    expect(alias.routes).toBeDefined();
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(shutdown).toHaveBeenCalledTimes(1);
  });
});
