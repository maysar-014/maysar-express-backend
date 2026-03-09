import express from 'express';
import request from 'supertest';
import { createModuleRoutes } from './module.routes';

describe('createModuleRoutes', () => {
  it('wires list/get/content/badges endpoints to controller handlers', async () => {
    const controller = {
      list: jest.fn((req, res) => res.status(200).json({ route: 'list' })),
      get: jest.fn((req, res) => res.status(200).json({ route: 'get', id: req.params.id })),
      getContent: jest.fn((req, res) =>
        res.status(200).json({ route: 'content', id: req.params.id })
      ),
      getLeaderboard: jest.fn((req, res) => res.status(200).json({ route: 'leaderboard' })),
      getLearnerBadges: jest.fn((req, res) =>
        res.status(200).json({ route: 'badges', learnerId: req.params.learnerId })
      )
    };

    const app = express();
    app.use('/modules', createModuleRoutes(controller as never));

    const listRes = await request(app).get('/modules');
    const getRes = await request(app).get('/modules/module-1');
    const contentRes = await request(app).get('/modules/module-1/content');
    const badgesRes = await request(app).get('/modules/badges/learner-1');

    expect(listRes.status).toBe(200);
    expect(getRes.body.id).toBe('module-1');
    expect(contentRes.body.route).toBe('content');
    expect(badgesRes.body.learnerId).toBe('learner-1');
    expect(controller.list).toHaveBeenCalled();
    expect(controller.get).toHaveBeenCalled();
    expect(controller.getContent).toHaveBeenCalled();
    expect(controller.getLearnerBadges).toHaveBeenCalled();
  });
});
