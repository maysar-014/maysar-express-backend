import { InspectionRun, PhaseCertificationStatus, ReleaseVerdict } from './governance.types';
import { PHASE_CATALOG, PhaseCatalogEntry } from './phase-catalog';

export interface PhaseReadinessSection {
  title: string;
  description: string;
  totalPhases: number;
  certifiedPhases: number;
  pendingPhases: number;
  notCertifiedPhases: number;
  rows: InspectionRun['phaseCertifications'];
  catalog: PhaseCatalogEntry[];
}

function isApproved(verdict: ReleaseVerdict | undefined): boolean {
  return verdict === 'APPROVED';
}

function getPhaseOrder(phase: string): number {
  const match = phase.match(/Phase\s+(\d+)/i);
  return match ? Number(match[1]) : Number.NaN;
}

export function buildPhaseCertifications(run: Pick<InspectionRun, 'targetPhase' | 'verdict' | 'finishedAt'> | null | undefined): InspectionRun['phaseCertifications'] {
  const currentPhaseNumber = run ? getPhaseOrder(run.targetPhase) : Number.NaN;
  const approved = isApproved(run?.verdict);

  return PHASE_CATALOG.map(entry => {
    const phaseNumber = getPhaseOrder(entry.phase);

    if (Number.isNaN(currentPhaseNumber) || phaseNumber > currentPhaseNumber) {
      return {
        phase: entry.phase,
        title: entry.title,
        implementationStatus: entry.implementationStatus,
        status: 'PENDING' as PhaseCertificationStatus,
        certifiedAt: null,
        reason: `Pending certification until ${entry.prerequisites.join(' and ') || 'the prior phase'} is complete.`,
        prerequisites: entry.prerequisites
      };
    }

    if (phaseNumber < currentPhaseNumber) {
      return {
        phase: entry.phase,
        title: entry.title,
        implementationStatus: entry.implementationStatus,
        status: 'CERTIFIED' as PhaseCertificationStatus,
        certifiedAt: null,
        reason: `${entry.phase} is an upstream prerequisite and is treated as certified in the current phase chain.`,
        prerequisites: entry.prerequisites
      };
    }

    if (!approved && phaseNumber === currentPhaseNumber) {
      return {
        phase: entry.phase,
        title: entry.title,
        implementationStatus: entry.implementationStatus,
        status: 'NOT_CERTIFIED' as PhaseCertificationStatus,
        certifiedAt: null,
        reason: `The ${entry.phase} audit has open blockers and cannot be certified yet.`,
        prerequisites: entry.prerequisites
      };
    }

    if (phaseNumber === currentPhaseNumber && approved) {
      return {
        phase: entry.phase,
        title: entry.title,
        implementationStatus: entry.implementationStatus,
        status: 'CERTIFIED' as PhaseCertificationStatus,
        certifiedAt: run?.finishedAt ?? null,
        reason: `${entry.phase} audit passed and the phase is certified.`,
        prerequisites: entry.prerequisites
      };
    }

    return {
      phase: entry.phase,
      title: entry.title,
      implementationStatus: entry.implementationStatus,
      status: 'PENDING' as PhaseCertificationStatus,
      certifiedAt: null,
      reason: `Awaiting certification for ${entry.phase}.`,
      prerequisites: entry.prerequisites
    };
  });
}

export function buildPhaseReadinessSection(run: Pick<InspectionRun, 'targetPhase' | 'verdict' | 'finishedAt'> | null | undefined): PhaseReadinessSection {
  const rows = buildPhaseCertifications(run);

  return {
    title: 'Phase Readiness',
    description: 'Shows each phase’s implementation status and its certification status, plus what it depends on.',
    totalPhases: rows.length,
    certifiedPhases: rows.filter(row => row.status === 'CERTIFIED').length,
    pendingPhases: rows.filter(row => row.status === 'PENDING').length,
    notCertifiedPhases: rows.filter(row => row.status === 'NOT_CERTIFIED').length,
    rows,
    catalog: PHASE_CATALOG
  };
}
