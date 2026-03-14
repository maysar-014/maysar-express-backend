import { CODDisputeController } from './cod-dispute.controller';

describe('CODDisputeController', () => {
  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 when resolution payload is incomplete', async () => {
    const useCase = { execute: jest.fn() };
    const controller = new CODDisputeController(useCase as never);
    const req: any = { params: { id: 'dispute-1' }, body: { resolution: 'text' } };
    const res = makeRes();

    await controller.resolveDispute(req, res);

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Missing resolution text or decision'
    });
  });

  it('resolves dispute and returns success response', async () => {
    const useCase = { execute: jest.fn().mockResolvedValue(undefined) };
    const controller = new CODDisputeController(useCase as never);
    const req: any = {
      params: { id: 'dispute-1' },
      body: { resolution: 'buyer refunded', decision: 'REFUND_BUYER' }
    };
    const res = makeRes();

    await controller.resolveDispute(req, res);

    expect(useCase.execute).toHaveBeenCalledWith({
      disputeId: 'dispute-1',
      resolution: 'buyer refunded',
      decision: 'REFUND_BUYER'
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Dispute dispute-1 resolved successfully with decision: REFUND_BUYER'
    });
  });

  it('returns 400 with error message when use case throws', async () => {
    const useCase = { execute: jest.fn().mockRejectedValue(new Error('cannot resolve')) };
    const controller = new CODDisputeController(useCase as never);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const req: any = {
      params: { id: 'dispute-1' },
      body: { resolution: 'x', decision: 'y' }
    };
    const res = makeRes();

    await controller.resolveDispute(req, res);

    expect(errorSpy).toHaveBeenCalledWith(
      '[Dispute] Resolution failed for dispute-1:',
      'cannot resolve'
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'cannot resolve'
    });
  });
});
