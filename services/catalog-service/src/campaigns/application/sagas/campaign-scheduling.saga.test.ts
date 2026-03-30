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

import { CampaignSchedulingSaga } from './campaign-scheduling.saga';

type CampaignSchedulingSagaLike = {
  sagaType: string;
  onStart(sagaId: string, payload: { campaignId: string }, correlationId: string): Promise<void>;
  onCompensate(sagaId: string, stepName: string): Promise<void>;
  defineSteps(): unknown[];
};

describe('CampaignSchedulingSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with expected saga type and service wiring', async () => {
    const saga = new CampaignSchedulingSaga() as unknown as CampaignSchedulingSagaLike;

    expect(superCtorMock).toHaveBeenCalledWith({ name: 'mock-saga-log-repo' }, 'campaign-service');
    expect(saga.sagaType).toBe('CampaignSchedulingSaga');
    await expect(saga.onStart('saga-2', { campaignId: 'camp-2' }, 'corr-2')).resolves.toBeUndefined();
    await expect(saga.onCompensate('saga-2', 'step-2')).resolves.toBeUndefined();
    expect(saga.defineSteps()).toEqual([]);
  });
});

