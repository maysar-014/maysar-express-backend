export type GovernanceSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export type GovernanceCategory = 'Functional' | 'Data Integrity' | 'Financial' | 'Operational' | 'Regression';

export type GateStatus = 'PASS' | 'FAIL' | 'MANUAL' | 'SKIPPED';

export type ReleaseVerdict = 'APPROVED' | 'DENIED' | 'APPROVED_WITH_RISK';
export type PhaseCertificationStatus = 'CERTIFIED' | 'PENDING' | 'NOT_CERTIFIED';
export type PhaseImplementationStatus = 'READY_TO_LAUNCH' | 'IN_DEVELOPMENT' | 'DESIGNED' | 'PLANNED';

export interface ConstitutionGateDefinition {
  id: string;
  title: string;
  category: GovernanceCategory | string;
  severity: GovernanceSeverity;
  blocking?: boolean;
  runner: 'http-endpoint' | 'service-readiness' | 'node-script-report' | 'filesystem-roundtrip' | 'database-query';
  path?: string;
  expectedStatus?: number;
  script?: string;
  reportPath?: string;
  targets?: Array<{
    name: string;
    url: string;
    expectedStatus?: number;
  }>;
}

export interface ConstitutionDocument {
  constitutionName: string;
  constitutionVersion: string;
  targetPhase: string;
  gates: ConstitutionGateDefinition[];
}

export interface EvidenceArtifact {
  label: string;
  type: 'json' | 'text' | 'url' | 'path';
  value: string;
}

export interface GateResult {
  gateId: string;
  title: string;
  category: string;
  severity: GovernanceSeverity;
  blocking?: boolean;
  status: GateStatus;
  summary: string;
  evidence: EvidenceArtifact[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface InspectionRun {
  runId: string;
  constitutionName: string;
  constitutionVersion: string;
  targetPhase: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  targetBaseUrl: string;
  verdict: ReleaseVerdict;
  gateResults: GateResult[];
  phaseCertifications: Array<{
    phase: string;
    title: string;
    implementationStatus: PhaseImplementationStatus;
    status: PhaseCertificationStatus;
    certifiedAt?: string | null;
    reason: string;
    prerequisites: string[];
  }>;
  summary: {
    totalGates: number;
    passed: number;
    failed: number;
    manual: number;
    skipped: number;
    p0: number;
    p1: number;
    p2: number;
    p3: number;
  };
}

export interface RunIndexEntry {
  runId: string;
  constitutionVersion: string;
  targetPhase: string;
  startedAt: string;
  finishedAt: string;
  verdict: ReleaseVerdict;
  summary: InspectionRun['summary'];
}

export interface GovernanceExecutionContext {
  targetBaseUrl: string;
  rootDir: string;
  reportDir: string;
  constitutionPath: string;
}

export interface GovernanceInspector {
  readonly gateId: string;
  inspect(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult>;
}
