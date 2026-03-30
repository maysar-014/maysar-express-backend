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

import { CampaignPricingSaga } from './campaign-pricing.saga';

type CampaignPricingSagaLike = {
  sagaType: string;
  onStart(sagaId: string, payload: { campaignId: string }, correlationId: string): Promise<void>;
  onCompensate(sagaId: string, stepName: string): Promise<void>;
  defineSteps(): unknown[];
};

describe('CampaignPricingSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with expected saga type and service wiring', async () => {
    const saga = new CampaignPricingSaga() as unknown as CampaignPricingSagaLike;

    expect(superCtorMock).toHaveBeenCalledWith({ name: 'mock-saga-log-repo' }, 'campaign-service');
    expect(saga.sagaType).toBe('CampaignPricingSaga');
    await expect(saga.onStart('saga-1', { campaignId: 'camp-1' }, 'corr-1')).resolves.toBeUndefined();
    await expect(saga.onCompensate('saga-1', 'step-1')).resolves.toBeUndefined();
    expect(saga.defineSteps()).toEqual([]);
  });
});

