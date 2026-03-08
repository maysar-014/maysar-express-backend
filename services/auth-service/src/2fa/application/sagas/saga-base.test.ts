import { BaseSaga } from './saga-base';

class TestSaga extends BaseSaga {
  public executedWith: unknown[] = [];
  public compensatedWith: unknown[] = [];

  async execute(...args: unknown[]): Promise<void> {
    this.executedWith = args;
  }

  async compensate(...args: unknown[]): Promise<void> {
    this.compensatedWith = args;
  }
}

describe('BaseSaga', () => {
  it('supports concrete execute and compensate implementations', async () => {
    const saga = new TestSaga();

    await saga.execute('step-1', { id: 'event-1' });
    await saga.compensate('rollback', { reason: 'failure' });

    expect(saga.executedWith).toEqual(['step-1', { id: 'event-1' }]);
    expect(saga.compensatedWith).toEqual(['rollback', { reason: 'failure' }]);
  });
});
