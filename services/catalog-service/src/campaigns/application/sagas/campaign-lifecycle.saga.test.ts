const superCtorMock = jest.fn();

jest.mock('@shared/saga/saga.orchestrator', () => ({
  DistributedSagaOrchestrator: class {
    constructor(...args: unknown[]) {
      superCtorMock(...args);
    }
  }
}));

jest.mock('../../infrastructure/repositories/saga.repository', () => ({
  sagaLogRepository: { name: 'mock-saga-log-repo' }
}));

import { CampaignLifecycleSaga } from './campaign-lifecycle.saga';

describe('CampaignLifecycleSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wires distributed saga base and returns defined steps', async () => {
    const campaignRepository = { save: jest.fn() };
    const saga = new CampaignLifecycleSaga(campaignRepository as never) as any;

    expect(superCtorMock).toHaveBeenCalledWith({ name: 'mock-saga-log-repo' }, 'campaign-service');
    expect(saga.sagaType).toBe('CampaignLifecycleSaga');
    await expect(saga.onStart('saga-1', { campaignId: 'camp-1' }, 'corr-1')).resolves.toBeUndefined();
    await expect(saga.onCompensate('saga-1', 'step-1')).resolves.toBeUndefined();
    expect(saga.defineSteps()).toEqual([]);
  });
});

