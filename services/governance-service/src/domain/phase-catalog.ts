export type PhaseImplementationStatus = 'READY_TO_LAUNCH' | 'IN_DEVELOPMENT' | 'DESIGNED' | 'PLANNED';

export interface PhaseCatalogEntry {
  phase: string;
  title: string;
  implementationStatus: PhaseImplementationStatus;
  constitutionPath: string;
  plannedGateCount: number;
  prerequisites: string[];
  note: string;
}

export const PHASE_CATALOG: PhaseCatalogEntry[] = [
  {
    phase: 'Phase 1',
    title: 'Foundation Launch',
    implementationStatus: 'READY_TO_LAUNCH',
    constitutionPath: 'services/governance-service/constitutions/phase-1.json',
    plannedGateCount: 9,
    prerequisites: [],
    note: 'Core marketplace operations must be healthy before any later phase can be evaluated.'
  },
  {
    phase: 'Phase 2',
    title: 'Trust & Intelligence Layer',
    implementationStatus: 'IN_DEVELOPMENT',
    constitutionPath: 'services/governance-service/constitutions/phase-2.json',
    plannedGateCount: 23,
    prerequisites: ['Phase 1 certified'],
    note: 'Depends on accurate identity, wallet, inventory, and order data from Phase 1.'
  },
  {
    phase: 'Phase 3',
    title: 'Commerce Communication',
    implementationStatus: 'DESIGNED',
    constitutionPath: 'services/governance-service/constitutions/phase-3.json',
    plannedGateCount: 27,
    prerequisites: ['Phase 2 certified'],
    note: 'Depends on stable buyer identity, trust scoring, and order truth.'
  },
  {
    phase: 'Phase 4',
    title: 'Ecosystem Expansion',
    implementationStatus: 'PLANNED',
    constitutionPath: 'services/governance-service/constitutions/phase-4.json',
    plannedGateCount: 18,
    prerequisites: ['Phase 3 certified'],
    note: 'Depends on chat reliability, reviews, and verified platform signals.'
  },
  {
    phase: 'Phase 5',
    title: 'Platform Maturity',
    implementationStatus: 'PLANNED',
    constitutionPath: 'services/governance-service/constitutions/phase-5.json',
    plannedGateCount: 11,
    prerequisites: ['Phase 4 certified'],
    note: 'Depends on the prior ecosystem, compliance, and operational maturity.'
  }
];
