import express from 'express';
import request from 'supertest';
import { createPayoutRoutes } from '../../api/routes/payout.routes';

describe('Payout Service Routes Integration', () => {
  it('returns payout detail using mounted route handler', async () => {
    const controller = {
      initiate: (_req: express.Request, res: express.Response) => res.status(201).json({ id: 'payout-1' }),
      list: (_req: express.Request, res: express.Response) => res.status(200).json({ data: [] }),
      listByUser: (req: express.Request, res: express.Response) => res.status(200).json({ data: [], userId: req.params.userId }),
      getPayout: (req: express.Request, res: express.Response) => res.status(200).json({ id: req.params.id }),
      cancel: (req: express.Request, res: express.Response) => res.status(200).json({ id: req.params.id, cancelled: true })
    } as any;

    const app = express();
    app.use(express.json());
    app.use('/api/payouts', createPayoutRoutes(controller));

    const response = await request(app).get('/api/payouts/pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV');

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV');
  });
  it('guards the user-scoped payout history route with self-or-admin access', async () => {
    const controller = {
      initiate: (_req: express.Request, res: express.Response) => res.status(201).json({ id: 'payout-1' }),
      list: (_req: express.Request, res: express.Response) => res.status(200).json({ data: [] }),
      listByUser: (req: express.Request, res: express.Response) => res.status(200).json({ data: [], userId: req.params.userId }),
      getPayout: (req: express.Request, res: express.Response) => res.status(200).json({ id: req.params.id }),
      cancel: (req: express.Request, res: express.Response) => res.status(200).json({ id: req.params.id, cancelled: true })
    } as any;

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).user = { userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAW', role: 'seller' };
      next();
    });
    app.use('/api/payouts', createPayoutRoutes(controller));

    const crossUser = await request(app).get('/api/payouts/user/usr_01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(crossUser.status).toBe(403);
    expect(crossUser.body.error.code).toBe('FORBIDDEN');

    const self = await request(app).get('/api/payouts/user/usr_01ARZ3NDEKTSV4RRFFQ69G5FAW');
    expect(self.status).toBe(200);
    expect(self.body.userId).toBe('usr_01ARZ3NDEKTSV4RRFFQ69G5FAW');
  });

  it('rejects unauthenticated payout history reads with 401', async () => {
    const controller = {
      initiate: (_req: express.Request, res: express.Response) => res.status(201).json({ id: 'payout-1' }),
      list: (_req: express.Request, res: express.Response) => res.status(200).json({ data: [] }),
      listByUser: (_req: express.Request, res: express.Response) => res.status(200).json({ data: [] }),
      getPayout: (req: express.Request, res: express.Response) => res.status(200).json({ id: req.params.id }),
      cancel: (req: express.Request, res: express.Response) => res.status(200).json({ id: req.params.id, cancelled: true })
    } as any;

    const app = express();
    app.use(express.json());
    app.use('/api/payouts', createPayoutRoutes(controller));

    const response = await request(app).get('/api/payouts/user/usr_01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });


});

