import { TrainingController } from './training.controller';

const createRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('TrainingController', () => {
  it('delegates requests to use cases and returns expected status codes', async () => {
    const start = { execute: jest.fn().mockResolvedValue({ ok: 'start' }) };
    const complete = { execute: jest.fn().mockResolvedValue({ ok: 'complete' }) };
    const progress = { execute: jest.fn().mockResolvedValue({ ok: 'progress' }) };
    const eligibility = { execute: jest.fn().mockResolvedValue({ ok: 'eligibility' }) };
    const track = { execute: jest.fn().mockResolvedValue({ ok: 'track' }) };
    const available = { execute: jest.fn().mockResolvedValue({ ok: 'available' }) };
    const controller = new TrainingController(
      start as never,
      complete as never,
      progress as never,
      eligibility as never,
      track as never,
      available as never
    );
    const next = jest.fn();

    const startRes = createRes();
    await controller.start({ body: { learnerId: 'l1' } } as never, startRes, next);
    expect(start.execute).toHaveBeenCalledWith({ learnerId: 'l1' });
    expect(startRes.status).toHaveBeenCalledWith(201);

    const completeRes = createRes();
    await controller.complete(
      { params: { id: 'record-1' }, body: { score: 90 } } as never,
      completeRes,
      next
    );
    expect(complete.execute).toHaveBeenCalledWith({ trainingRecordId: 'record-1', score: 90 });
    expect(completeRes.status).toHaveBeenCalledWith(200);

    const progressRes = createRes();
    await controller.getProgress({ params: { learnerId: 'l2' } } as never, progressRes, next);
    expect(progress.execute).toHaveBeenCalledWith({ learnerId: 'l2' });

    const eligibilityRes = createRes();
    await controller.checkEligibility({ params: { learnerId: 'l3' } } as never, eligibilityRes, next);
    expect(eligibility.execute).toHaveBeenCalledWith({ learnerId: 'l3' });

    const trackRes = createRes();
    await controller.trackProgress(
      { params: { id: 'record-2' }, body: { completionPercentage: 30 } } as never,
      trackRes,
      next
    );
    expect(track.execute).toHaveBeenCalledWith({
      trainingRecordId: 'record-2',
      progressData: { completionPercentage: 30 }
    });

    const availableRes = createRes();
    await controller.getAvailableModules(
      { query: { learnerId: 'l4', learnerRole: 'courier' } } as never,
      availableRes,
      next
    );
    expect(available.execute).toHaveBeenCalledWith({
      learnerId: 'l4',
      learnerRole: 'courier'
    });
  });

  it('forwards thrown errors to next()', async () => {
    const error = new Error('failed');
    const start = { execute: jest.fn().mockRejectedValue(error) };
    const controller = new TrainingController(
      start as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never
    );
    const res = createRes();
    const next = jest.fn();

    await controller.start({ body: {} } as never, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
