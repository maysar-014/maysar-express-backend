import express from 'express';
import request from 'supertest';
import { createPayoutRoutes } from '../../api/routes/payout.routes';

describe('Payout Service Routes Integration', () => {
  it('returns payout detail using mounted route handler', async () => {
    const controller = {
      initiate: (_req: express.Request, res: express.Response) => res.status(201).json({ id: 'payout-1' }),
      getPayout: (req: express.Request, res: express.Response) => res.status(200).json({ id: req.params.id }),
      cancel: (req: express.Request, res: express.Response) => res.status(200).json({ id: req.params.id, cancelled: true })
    } as any;

    const app = express();
    app.use(express.json());
    app.use('/api/payouts', createPayoutRoutes(controller));

    const response = await request(app).get('/api/payouts/payout-123');

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('payout-123');
  });
});

