import { CampaignController } from './campaign.controller';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CampaignController', () => {
  const createCampaign = { execute: jest.fn() };
  const getCampaign = { execute: jest.fn() };
  const listCampaignsUseCase = { execute: jest.fn() };
  const updateCampaignUseCase = { execute: jest.fn() };
  const launchCampaignUseCase = { execute: jest.fn() };
  const pauseCampaignUseCase = { execute: jest.fn() };
  const resumeCampaignUseCase = { execute: jest.fn() };
  const cancelCampaignUseCase = { execute: jest.fn() };
  const completeCampaignUseCase = { execute: jest.fn() };

  const controller = new CampaignController(
    createCampaign as never,
    getCampaign as never,
    listCampaignsUseCase as never,
    updateCampaignUseCase as never,
    launchCampaignUseCase as never,
    pauseCampaignUseCase as never,
    resumeCampaignUseCase as never,
    cancelCampaignUseCase as never,
    completeCampaignUseCase as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('create uses authenticated user id and returns 201', async () => {
    createCampaign.execute.mockResolvedValue({ id: 'camp-1' });
    const req: any = { user: { id: 'seller-1' } };
    const res = makeRes();

    await controller.create({ name: 'March Sale' } as never, req, res);

    expect(createCampaign.execute).toHaveBeenCalledWith('seller-1', 'seller-1', { name: 'March Sale' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'camp-1' });
  });

  it('list and get return use-case outputs', async () => {
    listCampaignsUseCase.execute.mockResolvedValue({ items: [{ id: 'camp-1' }] });
    getCampaign.execute.mockResolvedValue({ id: 'camp-2' });

    const listRes = makeRes();
    await controller.list({ query: { page: '1' } } as never, listRes);
    expect(listCampaignsUseCase.execute).toHaveBeenCalledWith({ page: '1' });
    expect(listRes.json).toHaveBeenCalledWith({ items: [{ id: 'camp-1' }] });

    const getRes = makeRes();
    await controller.get('camp-2', getRes);
    expect(getCampaign.execute).toHaveBeenCalledWith('camp-2');
    expect(getRes.json).toHaveBeenCalledWith({ id: 'camp-2' });
  });

  it('update/launch/pause/resume/cancel/complete route to their use cases', async () => {
    updateCampaignUseCase.execute.mockResolvedValue({ id: 'camp-3', status: 'draft' });
    launchCampaignUseCase.execute.mockResolvedValue({ id: 'camp-3', status: 'launched' });
    pauseCampaignUseCase.execute.mockResolvedValue({ id: 'camp-3', status: 'paused' });
    resumeCampaignUseCase.execute.mockResolvedValue({ id: 'camp-3', status: 'active' });
    cancelCampaignUseCase.execute.mockResolvedValue({ id: 'camp-3', status: 'cancelled' });
    completeCampaignUseCase.execute.mockResolvedValue({ id: 'camp-3', status: 'completed' });

    const updateRes = makeRes();
    await controller.update('camp-3', { budget: 10000 }, updateRes);
    expect(updateCampaignUseCase.execute).toHaveBeenCalledWith('camp-3', { budget: 10000 });
    expect(updateRes.json).toHaveBeenCalledWith({ id: 'camp-3', status: 'draft' });

    const launchRes = makeRes();
    await controller.launch('camp-3', launchRes);
    expect(launchCampaignUseCase.execute).toHaveBeenCalledWith('camp-3');
    expect(launchRes.json).toHaveBeenCalledWith({ id: 'camp-3', status: 'launched' });

    const pauseRes = makeRes();
    await controller.pause('camp-3', pauseRes);
    expect(pauseCampaignUseCase.execute).toHaveBeenCalledWith('camp-3');

    const resumeRes = makeRes();
    await controller.resume('camp-3', resumeRes);
    expect(resumeCampaignUseCase.execute).toHaveBeenCalledWith('camp-3');

    const cancelRes = makeRes();
    await controller.cancel('camp-3', cancelRes);
    expect(cancelCampaignUseCase.execute).toHaveBeenCalledWith('camp-3');

    const completeRes = makeRes();
    await controller.complete('camp-3', completeRes);
    expect(completeCampaignUseCase.execute).toHaveBeenCalledWith('camp-3');
  });

  it('maps errors to expected status codes', async () => {
    createCampaign.execute.mockRejectedValueOnce(new Error('invalid request'));
    const createErrRes = makeRes();
    await controller.create({} as never, { user: { id: 'seller-1' } } as never, createErrRes);
    expect(createErrRes.status).toHaveBeenCalledWith(400);

    getCampaign.execute.mockRejectedValueOnce(new Error('not found'));
    const getErrRes = makeRes();
    await controller.get('missing', getErrRes);
    expect(getErrRes.status).toHaveBeenCalledWith(404);
  });
});
