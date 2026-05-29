import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

import {
  ConstitutionGateDefinition,
  EvidenceArtifact,
  GateResult,
  GovernanceExecutionContext,
  GovernanceInspector
} from '../domain/governance.types';

export class FilesystemRoundtripInspector implements GovernanceInspector {
  constructor(public readonly gateId: string) {}

  async inspect(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const directory = path.resolve(context.rootDir, definition.reportPath ?? path.join('reports', 'governance'));
    const filePath = path.join(directory, 'write-test.json');
    const payload = {
      writtenAt: startedAt,
      constitutionPath: context.constitutionPath
    };

    try {
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
      const roundtrip = JSON.parse(fs.readFileSync(filePath, 'utf8')) as typeof payload;

      const status = roundtrip.writtenAt === payload.writtenAt ? 'PASS' : 'FAIL';
      const finishedAt = new Date().toISOString();
      const evidence: EvidenceArtifact[] = [
        { label: 'directory', type: 'path', value: directory },
        { label: 'filePath', type: 'path', value: filePath },
        { label: 'roundtrip', type: 'json', value: JSON.stringify(roundtrip, null, 2) }
      ];

      return {
        gateId: definition.id,
        title: definition.title,
        category: definition.category,
        severity: definition.severity,
        status,
        summary: status === 'PASS' ? 'Report storage is writable and readable' : 'Filesystem roundtrip mismatch',
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
        summary: error instanceof Error ? error.message : 'Unknown filesystem inspection error',
        evidence: [{ label: 'directory', type: 'path', value: directory }],
        startedAt,
        finishedAt,
        durationMs: Number((performance.now() - started).toFixed(2))
      };
    }
  }
}
