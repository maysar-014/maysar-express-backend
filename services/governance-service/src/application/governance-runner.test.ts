import fs from 'fs';
import os from 'os';
import path from 'path';

import { GovernanceRunner } from './governance-runner';
import { ConstitutionDocument, GovernanceInspector } from '../domain/governance.types';
import { buildPhaseCertifications } from '../domain/phase-certification';
import { GovernanceReportStore } from '../infrastructure/governance-report-store';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'governance-runner-'));
}

describe('GovernanceRunner', () => {
  it('persists a denied report when a P1 gate fails', async () => {
    const tempDir = createTempDir();
    const store = new GovernanceReportStore(path.join(tempDir, 'reports'));
    const constitution: ConstitutionDocument = {
      constitutionName: 'Test Constitution',
      constitutionVersion: '1',
      targetPhase: 'Phase 1',
      gates: [
        {
          id: 'OPS1.1',
          title: 'Health',
          category: 'Operational',
          severity: 'P0',
          runner: 'http-endpoint',
          path: '/health',
          expectedStatus: 200
        },
        {
          id: 'R1.1',
          title: 'Regression',
          category: 'Regression',
          severity: 'P1',
          runner: 'node-script-report',
          script: 'scripts/testing/constitution-compliance-audit.js',
          reportPath: 'reports/testing/constitution-compliance-report.json'
        }
      ]
    };

    const inspectors: GovernanceInspector[] = [
      {
        gateId: 'OPS1.1',
        inspect: async () => ({
          gateId: 'OPS1.1',
          title: 'Health',
          category: 'Operational',
          severity: 'P0',
          status: 'PASS',
          summary: 'healthy',
          evidence: [],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 1
        })
      },
      {
        gateId: 'R1.1',
        inspect: async () => ({
          gateId: 'R1.1',
          title: 'Regression',
          category: 'Regression',
          severity: 'P1',
          status: 'FAIL',
          summary: 'violations found',
          evidence: [],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 1
        })
      }
    ];

    const runner = new GovernanceRunner(constitution, inspectors, store);
    const report = await runner.run({
      targetBaseUrl: 'http://localhost:3000',
      rootDir: tempDir,
      reportDir: path.join(tempDir, 'reports'),
      constitutionPath: path.join(tempDir, 'constitution.json')
    });

    expect(report.verdict).toBe('DENIED');
    expect(report.summary.failed).toBe(1);
    expect(report.summary.p1).toBe(1);
    expect(report.phaseCertifications).toEqual(buildPhaseCertifications({
      targetPhase: 'Phase 1',
      verdict: 'DENIED',
      finishedAt: report.finishedAt
    }));
    expect(store.getLatestRun()?.runId).toBe(report.runId);
    expect(fs.existsSync(path.join(tempDir, 'reports', 'latest.json'))).toBe(true);
  });
});
