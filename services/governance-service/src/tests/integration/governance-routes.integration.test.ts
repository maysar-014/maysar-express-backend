import express from 'express';
import request from 'supertest';

import { createGovernanceRoutes } from '../../api/routes/governance.routes';

describe('governance-service routes integration', () => {
  it('returns the mounted constitution payload', async () => {
    const controller = {
      runAudit: (_req: express.Request, res: express.Response) => res.status(201).json({ report: { verdict: 'APPROVED' } }),
      listRuns: (_req: express.Request, res: express.Response) => res.json({ runs: [] }),
      getRun: (_req: express.Request, res: express.Response) => res.json({ run: { runId: 'run-1' } }),
      getEvidence: (_req: express.Request, res: express.Response) => res.json({ evidence: [] }),
      getLatestReport: (_req: express.Request, res: express.Response) => res.json({ report: { runId: 'run-1' } }),
      getConstitution: (_req: express.Request, res: express.Response) => res.json({
        constitution: {
          constitutionName: 'Maysar Express Launch Phase Constitution',
          constitutionVersion: '2026-05-29',
          targetPhase: 'Phase 1'
        }
      }),
      getSummary: (_req: express.Request, res: express.Response) => res.json({ targetPhase: 'Phase 1', verdict: 'APPROVED' }),
      getDashboard: (_req: express.Request, res: express.Response) => res.json({ hasRun: true })
    };

    const app = express();
    app.use('/api/governance', createGovernanceRoutes(controller));

    const response = await request(app).get('/api/governance/constitution');

    expect(response.status).toBe(200);
    expect(response.body.constitution).toMatchObject({
      constitutionName: 'Maysar Express Launch Phase Constitution',
      constitutionVersion: '2026-05-29',
      targetPhase: 'Phase 1'
    });
  });
});
