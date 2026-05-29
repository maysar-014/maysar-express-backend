import { performance } from 'perf_hooks';

import {
  ConstitutionGateDefinition,
  EvidenceArtifact,
  GateResult,
  GovernanceExecutionContext,
  GovernanceInspector
} from '../../domain/governance.types';

type ReadinessTarget = {
  name: string;
  url: string;
  expectedStatus?: number;
};

function toTargetList(definition: ConstitutionGateDefinition): ReadinessTarget[] {
  if (definition.targets && definition.targets.length > 0) {
    return definition.targets;
  }

  const rawTargets = process.env.GOVERNANCE_SERVICE_READINESS_TARGETS_JSON;
  if (!rawTargets) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawTargets) as ReadinessTarget[];
    return Array.isArray(parsed) ? parsed.filter(target => Boolean(target?.name) && Boolean(target?.url)) : [];
  } catch {
    return [];
  }
}

export class ServiceReadinessInspector implements GovernanceInspector {
  constructor(public readonly gateId: string) {}

  async inspect(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const targets = toTargetList(definition);

    if (targets.length === 0) {
      const finishedAt = new Date().toISOString();
      return {
        gateId: definition.id,
        title: definition.title,
        category: definition.category,
        severity: definition.severity,
        status: 'SKIPPED',
        summary: 'No service readiness targets configured',
        evidence: [],
        startedAt,
        finishedAt,
        durationMs: Number((performance.now() - started).toFixed(2))
      };
    }

    const checks = [];
    for (const target of targets) {
      try {
        const response = await fetch(target.url, { method: 'GET' });
        const bodyText = await response.text();
        const expectedStatus = target.expectedStatus ?? 200;
        checks.push({
          name: target.name,
          url: target.url,
          expectedStatus,
          actualStatus: response.status,
          ok: response.status === expectedStatus,
          body: bodyText.slice(0, 2000)
        });
      } catch (error) {
        checks.push({
          name: target.name,
          url: target.url,
          expectedStatus: target.expectedStatus ?? 200,
          actualStatus: null,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown readiness error'
        });
      }
    }

    const status = checks.every(check => check.ok) ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    const evidence: EvidenceArtifact[] = [
      { label: 'targets', type: 'json', value: JSON.stringify(checks, null, 2) }
    ];

    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? `${checks.length} readiness endpoints responded as expected`
        : `${checks.filter(check => !check.ok).length} readiness endpoints failed`,
      evidence,
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }
}
