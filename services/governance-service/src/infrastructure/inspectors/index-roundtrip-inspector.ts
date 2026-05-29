import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

import {
  ConstitutionGateDefinition,
  EvidenceArtifact,
  GateResult,
  GovernanceExecutionContext,
  GovernanceInspector
} from '../../domain/governance.types';

export class IndexRoundtripInspector implements GovernanceInspector {
  constructor(public readonly gateId: string) {}

  async inspect(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const indexPath = path.join(context.reportDir, 'index.json');
    const tempRunId = `probe-${Date.now()}`;
    const originalIndex = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : null;

    try {
      fs.mkdirSync(context.reportDir, { recursive: true });
      const existingIndex = originalIndex
        ? JSON.parse(originalIndex) as Array<Record<string, unknown>>
        : [];
      const probeEntry = {
        runId: tempRunId,
        constitutionVersion: 'probe',
        targetPhase: 'probe',
        startedAt,
        finishedAt: startedAt,
        verdict: 'APPROVED',
        summary: { totalGates: 0, passed: 0, failed: 0, manual: 0, skipped: 0, p0: 0, p1: 0, p2: 0, p3: 0 }
      };
      const nextIndex = [probeEntry, ...existingIndex.filter(entry => entry.runId !== tempRunId)];
      fs.writeFileSync(indexPath, JSON.stringify(nextIndex, null, 2));
      const roundtrip = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as Array<{ runId?: string }>;
      const status = roundtrip.some(entry => entry.runId === tempRunId) ? 'PASS' : 'FAIL';
      const finishedAt = new Date().toISOString();
      const evidence: EvidenceArtifact[] = [
        { label: 'indexPath', type: 'path', value: indexPath },
        { label: 'probeEntry', type: 'json', value: JSON.stringify(probeEntry, null, 2) },
        { label: 'roundtripIndex', type: 'json', value: JSON.stringify(roundtrip.slice(0, 5), null, 2) }
      ];

      return {
        gateId: definition.id,
        title: definition.title,
        category: definition.category,
        severity: definition.severity,
        status,
        summary: status === 'PASS' ? 'Governance index roundtrip succeeded' : 'Governance index did not persist the probe entry',
        evidence,
        startedAt,
        finishedAt,
        durationMs: Number((performance.now() - started).toFixed(2))
      };
    } catch (error) {
      const finishedAt = new Date().toISOString();
      return {
        gateId: definition.id,
        title: definition.title,
        category: definition.category,
        severity: definition.severity,
        status: 'FAIL',
        summary: error instanceof Error ? error.message : 'Unknown index inspection error',
        evidence: [{ label: 'indexPath', type: 'path', value: indexPath }],
        startedAt,
        finishedAt,
        durationMs: Number((performance.now() - started).toFixed(2))
      };
    } finally {
      if (originalIndex !== null) {
        fs.writeFileSync(indexPath, originalIndex);
      } else if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
      }
    }
  }
}
