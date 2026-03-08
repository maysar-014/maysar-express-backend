import { DistributedSagaOrchestrator } from './saga.orchestrator';
import { SagaDependencies, SagaFactory } from './saga-factory';

describe('SagaFactory', () => {
  class FakeSagaOrchestrator {
    constructor(public readonly deps: SagaDependencies) {}
  }

  const deps: SagaDependencies = {
    sagaLogRepository: {} as SagaDependencies['sagaLogRepository'],
    serviceName: 'auth-service'
  };

  beforeEach(() => {
    SagaFactory.clear();
  });

  it('returns singleton instance per service and saga class', () => {
    const first = SagaFactory.create(
      FakeSagaOrchestrator as unknown as new (deps: SagaDependencies) => DistributedSagaOrchestrator,
      deps
    );
    const second = SagaFactory.create(
      FakeSagaOrchestrator as unknown as new (deps: SagaDependencies) => DistributedSagaOrchestrator,
      deps
    );

    expect(first).toBe(second);
    expect(SagaFactory.getRegistry().size).toBe(1);
  });

  it('registers and retrieves orchestrators by saga type', () => {
    const fakeOrchestrator = {} as DistributedSagaOrchestrator;

    SagaFactory.registerByType('OrderFulfillmentSaga', fakeOrchestrator);

    expect(SagaFactory.getRegistry().get('OrderFulfillmentSaga')).toBe(fakeOrchestrator);
  });

  it('clears all registered instances', () => {
    SagaFactory.registerByType('A', {} as DistributedSagaOrchestrator);
    SagaFactory.registerByType('B', {} as DistributedSagaOrchestrator);

    SagaFactory.clear();

    expect(SagaFactory.getRegistry().size).toBe(0);
  });
});
