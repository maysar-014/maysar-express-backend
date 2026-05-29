import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { performance } from 'perf_hooks';

import {
  ConstitutionGateDefinition,
  EvidenceArtifact,
  GateResult,
  GovernanceExecutionContext,
  GovernanceInspector
} from '../../domain/governance.types';

function resolvePath(rootDir: string, relativePath: string): string {
  return path.resolve(rootDir, relativePath);
}

function inferSeverity(summary: { missingTests?: number; domainPurityViolations?: number; domainTestPurityViolations?: number; coverageViolations?: number; filesWithoutCoverageData?: number; locationViolations?: number; internalMockViolations?: number; assertionViolations?: number; servicesMissingIntegrationTests?: number; priority1CoverageFailures?: number }): 'PASS' | 'FAIL' {
  const values = Object.values(summary).map(value => Number(value ?? 0));
  return values.some(value => value > 0) ? 'FAIL' : 'PASS';
}

export class NodeScriptReportInspector implements GovernanceInspector {
  constructor(public readonly gateId: string) {}

  async inspect(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const scriptPath = resolvePath(context.rootDir, definition.script ?? '');
    const reportPath = resolvePath(context.rootDir, definition.reportPath ?? '');
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: context.rootDir,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    let report: Record<string, any> | null = null;
    if (fs.existsSync(reportPath)) {
      report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as Record<string, any>;
    }

    const summary = (report?.summary ?? {}) as Record<string, number>;
    const status = result.status === 0 && inferSeverity(summary) === 'PASS' ? 'PASS' : 'FAIL';
    const evidence: EvidenceArtifact[] = [
      { label: 'scriptPath', type: 'path', value: scriptPath },
      { label: 'reportPath', type: 'path', value: reportPath }
    ];

    if (result.stdout) {
      evidence.push({ label: 'stdout', type: 'text', value: String(result.stdout).slice(0, 5000) });
    }

    if (result.stderr) {
      evidence.push({ label: 'stderr', type: 'text', value: String(result.stderr).slice(0, 5000) });
    }

    if (report) {
      evidence.push({ label: 'report', type: 'json', value: JSON.stringify(report, null, 2).slice(0, 15000) });
    }

    const finishedAt = new Date().toISOString();
    const summaryText = status === 'FAIL'
      ? `${definition.title} reported constitutional violations`
      : `${definition.title} passed without violations`;

    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: summaryText,
      evidence,
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }
}
