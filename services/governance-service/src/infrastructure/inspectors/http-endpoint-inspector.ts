import { performance } from 'perf_hooks';

import {
  ConstitutionGateDefinition,
  EvidenceArtifact,
  GateResult,
  GovernanceExecutionContext,
  GovernanceInspector
} from '../../domain/governance.types';

function buildUrl(baseUrl: string, pathFragment: string): string {
  return new URL(pathFragment, baseUrl).toString();
}

function statusToSeverityStatus(status: number, expectedStatus: number): 'PASS' | 'FAIL' {
  return status === expectedStatus ? 'PASS' : 'FAIL';
}

export class HttpEndpointInspector implements GovernanceInspector {
  constructor(public readonly gateId: string) {}

  async inspect(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const url = buildUrl(context.targetBaseUrl, definition.path ?? '/');

    try {
      const response = await fetch(url, { method: 'GET' });
      const bodyText = await response.text();
      const expectedStatus = definition.expectedStatus ?? 200;
      const status = statusToSeverityStatus(response.status, expectedStatus);
      const evidence: EvidenceArtifact[] = [
        { label: 'requestUrl', type: 'url', value: url },
        { label: 'status', type: 'text', value: String(response.status) },
        { label: 'body', type: 'text', value: bodyText.slice(0, 5000) }
      ];

      const finishedAt = new Date().toISOString();
      return {
        gateId: definition.id,
        title: definition.title,
        category: definition.category,
        severity: definition.severity,
        status,
        summary: status === 'PASS' ? `Received ${response.status} from ${definition.path}` : `Expected ${expectedStatus} but received ${response.status}`,
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
        summary: error instanceof Error ? error.message : 'Unknown HTTP inspection error',
        evidence: [{ label: 'requestUrl', type: 'url', value: url }],
        startedAt,
        finishedAt,
        durationMs: Number((performance.now() - started).toFixed(2))
      };
    }
  }
}

