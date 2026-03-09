import { SagaRegistry } from './saga-registry';

describe('SagaRegistry', () => {
  beforeEach(() => {
    delete (SagaRegistry as any).instance;
  });

  afterAll(() => {
    delete (SagaRegistry as any).instance;
  });

  it('registers orchestrators and starts named saga', async () => {
    const registry = SagaRegistry.getInstance();
    const orchestrator = {
      start: jest.fn().mockResolvedValue('corr-1')
    };

    registry.registerOrchestrator('DeliverySaga', orchestrator as never);
    const correlationId = await registry.startSaga('DeliverySaga', { deliveryId: 'd1' });

    expect(orchestrator.start).toHaveBeenCalledWith({ deliveryId: 'd1' }, undefined);
    expect(correlationId).toBe('corr-1');
    expect(registry.isSagaRegistered('DeliverySaga')).toBe(true);
    expect(registry.listSagas()).toEqual(['DeliverySaga']);
    expect(registry.getSagaCount()).toBe(1);
    expect(registry.getOrchestrator('DeliverySaga')).toBe(orchestrator);
  });

  it('throws for unknown saga name and supports clear', async () => {
    const registry = SagaRegistry.getInstance();

    await expect(registry.startSaga('MissingSaga', {})).rejects.toThrow('Saga orchestrator not found: MissingSaga');
    registry.registerOrchestrator('One', { start: jest.fn() } as never);
    registry.clearRegistry();
    expect(registry.getSagaCount()).toBe(0);
  });
});
