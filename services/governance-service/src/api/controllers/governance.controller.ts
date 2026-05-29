import { Request, Response } from 'express';

import { GovernanceRunner } from '../../application/governance-runner';
import { ConstitutionDocument } from '../../domain/governance.types';
import { buildPhaseCertifications, buildPhaseReadinessSection } from '../../domain/phase-certification';
import { GovernanceReportStore } from '../../infrastructure/governance-report-store';

type DashboardGateRow = {
  gateId: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  summary: string;
  durationMs: number;
  evidenceCount: number;
  blocking: boolean;
};

type OperatorSummary = {
  totalGates: number;
  blockingGates: number;
  advisoryGates: number;
  passedGates: number;
  failedGates: number;
  skippedGates: number;
};

export class GovernanceController {
  constructor(
    private readonly runner: GovernanceRunner,
    private readonly reportStore: GovernanceReportStore,
    private readonly constitution: ConstitutionDocument,
    private readonly contextFactory: () => { targetBaseUrl: string; rootDir: string; reportDir: string; constitutionPath: string }
  ) {}

  async runAudit(req: Request, res: Response): Promise<void> {
    const targetBaseUrl = typeof req.body?.targetBaseUrl === 'string' && req.body.targetBaseUrl.trim().length > 0
      ? req.body.targetBaseUrl
      : this.contextFactory().targetBaseUrl;

    const report = await this.runner.run({
      ...this.contextFactory(),
      targetBaseUrl
    });

    res.status(201).json({ report });
  }

  listRuns(_req: Request, res: Response): void {
    res.json({ runs: this.reportStore.listRuns() });
  }

  getRun(req: Request, res: Response): void {
    const run = this.reportStore.getRun(req.params.runId);
    if (!run) {
      res.status(404).json({ error: 'Governance run not found' });
      return;
    }

    res.json({ run });
  }

  getEvidence(req: Request, res: Response): void {
    const evidence = this.reportStore.getEvidence(req.params.runId, req.params.gateId);
    if (!evidence) {
      res.status(404).json({ error: 'Governance evidence not found' });
      return;
    }

    res.json({ evidence });
  }

  getLatestReport(_req: Request, res: Response): void {
    const latest = this.reportStore.getLatestRun();
    if (!latest) {
      res.status(404).json({ error: 'No governance report has been generated yet' });
      return;
    }

    res.json({ report: latest });
  }

  getConstitution(_req: Request, res: Response): void {
    res.json({ constitution: this.constitution });
  }

  getSummary(_req: Request, res: Response): void {
    const latest = this.reportStore.getLatestRun();
    const response = latest
      ? {
          targetPhase: latest.targetPhase,
          verdict: latest.verdict,
          summary: latest.summary,
          phaseCertifications: latest.phaseCertifications,
          startedAt: latest.startedAt,
          finishedAt: latest.finishedAt,
          runId: latest.runId
        }
      : {
          targetPhase: this.constitution.targetPhase,
          verdict: 'DENIED' as const,
          phaseCertifications: buildPhaseCertifications(null),
          summary: {
            totalGates: 0,
            passed: 0,
            failed: 0,
            manual: 0,
            skipped: 0,
            p0: 0,
            p1: 0,
            p2: 0,
            p3: 0
          },
          startedAt: null,
          finishedAt: null,
          runId: null
        };

    res.json(response);
  }

  getDashboard(_req: Request, res: Response): void {
    const latest = this.reportStore.getLatestRun();
    if (!latest) {
      const phaseReadiness = buildPhaseReadinessSection(null);
      res.json({
        hasRun: false,
        constitution: this.constitution,
        latestReport: null,
        phaseCertifications: phaseReadiness.rows,
        phaseReadiness,
        gateTable: [],
        blockerCount: 0,
        advisoryCount: 0,
        advisoryGateTable: [],
        operatorSummary: {
          totalGates: 0,
          blockingGates: 0,
          advisoryGates: 0,
          passedGates: 0,
          failedGates: 0,
          skippedGates: 0
        },
        verdict: 'DENIED' as const
      });
      return;
    }

    const gateTable: DashboardGateRow[] = latest.gateResults.map(result => ({
      gateId: result.gateId,
      title: result.title,
      category: result.category,
      severity: result.severity,
      status: result.status,
      summary: result.summary,
      durationMs: result.durationMs,
      evidenceCount: result.evidence.length,
      blocking: result.blocking !== false
    }));

    const sortedGateTable = [...gateTable].sort((left, right) => {
      if (left.blocking !== right.blocking) {
        return left.blocking ? -1 : 1;
      }
      if (left.status !== right.status) {
        return left.status === 'FAIL' ? -1 : 1;
      }
      return left.gateId.localeCompare(right.gateId);
    });
    const advisoryGateTable = sortedGateTable.filter(result => !result.blocking);
    const blockerCount = sortedGateTable.filter(result => result.blocking).length;
    const advisoryCount = advisoryGateTable.length;
    const operatorSummary: OperatorSummary = {
      totalGates: latest.gateResults.length,
      blockingGates: blockerCount,
      advisoryGates: advisoryCount,
      passedGates: latest.summary.passed,
      failedGates: latest.summary.failed,
      skippedGates: latest.summary.skipped
    };

    res.json({
      hasRun: true,
      constitution: {
        name: latest.constitutionName,
        version: latest.constitutionVersion,
        targetPhase: latest.targetPhase
      },
      latestReport: {
        runId: latest.runId,
        verdict: latest.verdict,
        startedAt: latest.startedAt,
        finishedAt: latest.finishedAt,
        summary: latest.summary,
        phaseCertifications: latest.phaseCertifications
      },
      phaseCertifications: latest.phaseCertifications,
      phaseReadiness: {
        ...buildPhaseReadinessSection({
          targetPhase: latest.targetPhase,
          verdict: latest.verdict,
          finishedAt: latest.finishedAt
        }),
        rows: latest.phaseCertifications
      },
      gateTable: sortedGateTable,
      blockerCount,
      advisoryCount,
      advisoryGateTable,
      operatorSummary
    });
  }
}
