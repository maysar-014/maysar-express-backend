import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';

import { GovernanceController } from './controllers/governance.controller';
import { createGovernanceRoutes } from './routes/governance.routes';
import { ConstitutionDocument, InspectionRun } from '../domain/governance.types';
import { buildPhaseCertifications, buildPhaseReadinessSection } from '../domain/phase-certification';
import { GovernanceReportStore } from '../infrastructure/governance-report-store';
import { GovernanceRunner } from '../application/governance-runner';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'governance-http-'));
}

describe('governance api', () => {
  it('exposes constitution and report endpoints', async () => {
    const tempDir = createTempDir();
    const constitution: ConstitutionDocument = {
      constitutionName: 'Test Constitution',
      constitutionVersion: '1',
      targetPhase: 'Phase 1',
      gates: []
    };

    const store = new GovernanceReportStore(path.join(tempDir, 'reports'));
    const seededFinishedAt = new Date().toISOString();
    const seededReport: InspectionRun = {
      runId: 'run-1',
      constitutionName: 'Test Constitution',
      constitutionVersion: '1',
      targetPhase: 'Phase 1',
      startedAt: new Date().toISOString(),
      finishedAt: seededFinishedAt,
      durationMs: 5,
      targetBaseUrl: 'http://localhost:3000',
      verdict: 'APPROVED',
      gateResults: [
        {
          gateId: 'OPS1.1',
          title: 'Health',
          category: 'Operational',
          severity: 'P0',
          status: 'PASS',
          summary: 'healthy',
          evidence: [
            { label: 'requestUrl', type: 'url', value: 'http://localhost:3000/health' }
          ],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 3
        }
      ],
      summary: {
        totalGates: 1,
        passed: 1,
        failed: 0,
        manual: 0,
        skipped: 0,
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0
      },
      phaseCertifications: buildPhaseCertifications({
        targetPhase: 'Phase 1',
        verdict: 'APPROVED',
        finishedAt: seededFinishedAt
      })
    };
    store.saveRun(seededReport);

    const createdReport: InspectionRun = {
      ...seededReport,
      runId: 'run-2',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString()
    };

    const runner = {
      run: async () => {
        store.saveRun(createdReport);
        return createdReport;
      }
    } as unknown as GovernanceRunner;

    const controller = new GovernanceController(runner, store, constitution, () => ({
      targetBaseUrl: 'http://localhost:3000',
      rootDir: tempDir,
      reportDir: path.join(tempDir, 'reports'),
      constitutionPath: path.join(tempDir, 'constitution.json')
    }));

    const app = express();
    app.use(express.json());
    app.use('/api/governance', createGovernanceRoutes(controller));

    await request(app)
      .get('/api/governance/constitution')
      .expect(200)
      .expect(response => {
        expect(response.body.constitution.constitutionName).toBe('Test Constitution');
      });

    await request(app)
      .post('/api/governance/runs')
      .send({ targetBaseUrl: 'http://localhost:4000' })
      .expect(201)
      .expect(response => {
        expect(response.body.report.runId).toBe('run-2');
      });

    await request(app)
      .get('/api/governance/reports/latest')
      .expect(200)
      .expect(response => {
        expect(response.body.report.runId).toBe('run-2');
      });

    await request(app)
      .get('/api/governance/runs/run-1/evidence/OPS1.1')
      .expect(200)
      .expect(response => {
        expect(response.body.evidence.gateId).toBe('OPS1.1');
        expect(response.body.evidence.evidence[0].value).toContain('/health');
      });

    await request(app)
      .get('/api/governance/summary')
      .expect(200)
      .expect(response => {
        expect(response.body.verdict).toBe('APPROVED');
        expect(response.body.phaseCertifications).toHaveLength(5);
      });

    await request(app)
      .get('/api/governance/dashboard')
      .expect(200)
      .expect(response => {
        expect(response.body.hasRun).toBe(true);
        expect(response.body.gateTable).toHaveLength(1);
        expect(response.body.gateTable[0].gateId).toBe('OPS1.1');
        expect(response.body.gateTable[0].blocking).toBe(true);
        expect(response.body.blockerCount).toBe(1);
        expect(response.body.advisoryCount).toBe(0);
        expect(response.body.advisoryGateTable).toHaveLength(0);
        expect(response.body.operatorSummary.totalGates).toBe(1);
        expect(response.body.operatorSummary.blockingGates).toBe(1);
        expect(response.body.operatorSummary.advisoryGates).toBe(0);
        expect(response.body.operatorSummary.failedGates).toBe(0);
        expect(response.body.phaseCertifications).toHaveLength(5);
        expect(response.body.latestReport.phaseCertifications).toHaveLength(5);
        expect(response.body.phaseReadiness).toEqual(buildPhaseReadinessSection({
          targetPhase: 'Phase 1',
          verdict: 'APPROVED',
          finishedAt: seededReport.finishedAt
        }));
      });
  });
});
