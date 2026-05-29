import crypto from 'crypto';

import {
  ConstitutionDocument,
  GateResult,
  GovernanceExecutionContext,
  GovernanceInspector,
  InspectionRun,
  ReleaseVerdict
} from '../domain/governance.types';
import { buildPhaseCertifications } from '../domain/phase-certification';
import { GovernanceReportStore } from '../infrastructure/governance-report-store';

function tallyResults(gateResults: GateResult[]): InspectionRun['summary'] {
  const summary = {
    totalGates: gateResults.length,
    passed: 0,
    failed: 0,
    manual: 0,
    skipped: 0,
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0
  };

  for (const result of gateResults) {
    if (result.status === 'PASS') summary.passed += 1;
    if (result.status === 'FAIL') summary.failed += 1;
    if (result.status === 'MANUAL') summary.manual += 1;
    if (result.status === 'SKIPPED') summary.skipped += 1;
    if (result.severity === 'P0') summary.p0 += 1;
    if (result.severity === 'P1') summary.p1 += 1;
    if (result.severity === 'P2') summary.p2 += 1;
    if (result.severity === 'P3') summary.p3 += 1;
  }

  return summary;
}

function deriveVerdict(gateResults: GateResult[]): ReleaseVerdict {
  const hasP0OrP1Failure = gateResults.some(result =>
    result.blocking !== false &&
    result.status === 'FAIL' &&
    (result.severity === 'P0' || result.severity === 'P1')
  );
  if (hasP0OrP1Failure) {
    return 'DENIED';
  }

  const hasP2Failure = gateResults.some(result =>
    result.blocking !== false &&
    result.status === 'FAIL' &&
    result.severity === 'P2'
  );
  if (hasP2Failure) {
    return 'APPROVED_WITH_RISK';
  }

  return 'APPROVED';
}

export class GovernanceRunner {
  constructor(
    private readonly constitution: ConstitutionDocument,
    private readonly inspectors: GovernanceInspector[],
    private readonly reportStore: GovernanceReportStore
  ) {}

  async run(context: GovernanceExecutionContext): Promise<InspectionRun> {
    const startedAt = new Date().toISOString();
    const runId = crypto.randomUUID();
    const inspectorByGate = new Map(this.inspectors.map(inspector => [inspector.gateId, inspector]));
    const gateResults: GateResult[] = [];

    for (const definition of this.constitution.gates) {
      const inspector = inspectorByGate.get(definition.id);
      if (!inspector) {
        const finishedAt = new Date().toISOString();
        gateResults.push({
          gateId: definition.id,
          title: definition.title,
          category: definition.category,
          severity: definition.severity,
          blocking: definition.blocking,
          status: 'SKIPPED',
          summary: 'No inspector configured for this gate yet',
          evidence: [],
          startedAt: finishedAt,
          finishedAt,
          durationMs: 0
        });
        continue;
      }

      gateResults.push({
        ...(await inspector.inspect(context, definition)),
        blocking: definition.blocking
      });
    }

    const finishedAt = new Date().toISOString();
    const report: InspectionRun = {
      runId,
      constitutionName: this.constitution.constitutionName,
      constitutionVersion: this.constitution.constitutionVersion,
      targetPhase: this.constitution.targetPhase,
      startedAt,
      finishedAt,
      durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
      targetBaseUrl: context.targetBaseUrl,
      verdict: deriveVerdict(gateResults),
      gateResults,
      phaseCertifications: buildPhaseCertifications({
        targetPhase: this.constitution.targetPhase,
        verdict: deriveVerdict(gateResults),
        finishedAt
      }),
      summary: tallyResults(gateResults)
    };

    this.reportStore.saveRun(report);
    return report;
  }
}
