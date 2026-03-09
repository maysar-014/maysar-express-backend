import express from 'express';
import request from 'supertest';
import { createTrainingRoutes } from './training.routes';

describe('createTrainingRoutes', () => {
  it('wires training workflow endpoints to controller methods', async () => {
    const controller = {
      start: jest.fn((req, res) => res.status(201).json({ route: 'start' })),
      complete: jest.fn((req, res) => res.status(200).json({ route: 'complete', id: req.params.id })),
      getProgress: jest.fn((req, res) =>
        res.status(200).json({ route: 'progress', learnerId: req.params.learnerId })
      ),
      checkEligibility: jest.fn((req, res) =>
        res.status(200).json({ route: 'eligibility', learnerId: req.params.learnerId })
      ),
      getAvailableModules: jest.fn((req, res) => res.status(200).json({ route: 'available' })),
      trackProgress: jest.fn((req, res) =>
        res.status(200).json({ route: 'trackProgress', id: req.params.id })
      )
    };
    const app = express();
    app.use(express.json());
    app.use('/training', createTrainingRoutes(controller as never));
    app.use((err: any, req: any, res: any, next: any) =>
      res.status(400).json({ message: err.message, errors: err.errors })
    );

    const startRes = await request(app)
      .post('/training/start')
      .send({ learnerId: 'learner-1', learnerRole: 'courier', moduleId: 'module-1' });
    const startInvalidRes = await request(app).post('/training/start').send({});
    const completeRes = await request(app).post('/training/record-1/complete').send({ score: 88 });
    const progressRes = await request(app).get('/training/progress/learner-1');
    const eligibilityRes = await request(app).get('/training/eligibility/learner-1');
    const availableRes = await request(app).get('/training/available?learnerId=learner-1&learnerRole=courier');
    const trackRes = await request(app).post('/training/record-1/progress').send({ completionPercentage: 30 });

    expect(startRes.status).toBe(201);
    expect(startInvalidRes.status).toBe(400);
    expect(completeRes.body.id).toBe('record-1');
    expect(progressRes.body.route).toBe('progress');
    expect(eligibilityRes.body.route).toBe('eligibility');
    expect(availableRes.body.route).toBe('available');
    expect(trackRes.body.id).toBe('record-1');
    expect(controller.start).toHaveBeenCalled();
    expect(controller.complete).toHaveBeenCalled();
    expect(controller.getProgress).toHaveBeenCalled();
    expect(controller.checkEligibility).toHaveBeenCalled();
    expect(controller.getAvailableModules).toHaveBeenCalled();
    expect(controller.trackProgress).toHaveBeenCalled();
  });
});
