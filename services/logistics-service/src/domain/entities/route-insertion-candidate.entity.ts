/**
 * Phase 5 §5.2 — RouteInsertionCandidate entity.
 * APPEND-ONLY: created on every insertion evaluation, never mutated. This
 * enables retrospective analysis of optimization quality (backlog §5.2).
 */

export type InsertionRejectionReason = 'CAPACITY' | 'THRESHOLD' | 'VEHICLE_CLASS' | null;

export interface RouteInsertionCandidateData {
  id: string;
  shipmentId: string;
  deliveryJobId: string;
  marginalCostTzs: number;
  additionalDistanceKm: number;
  additionalDurationMinutes: number;
  feasible: boolean;
  rejectionReason: InsertionRejectionReason;
  evaluatedAt: Date;
}

export class RouteInsertionCandidate {
  private constructor(private readonly data: RouteInsertionCandidateData) {}

  static create(params: {
    id: string;
    shipmentId: string;
    deliveryJobId: string;
    marginalCostTzs: number;
    additionalDistanceKm: number;
    additionalDurationMinutes: number;
    feasible: boolean;
    rejectionReason: InsertionRejectionReason;
    evaluatedAt?: Date;
  }): RouteInsertionCandidate {
    if (params.marginalCostTzs < 0) {
      throw new Error('RouteInsertionCandidate invariant violation: marginalCostTzs cannot be negative');
    }
    // Invariant: an infeasible candidate must carry a rejection reason, and a
    // feasible one must not.
    if (!params.feasible && !params.rejectionReason) {
      throw new Error('RouteInsertionCandidate invariant violation: infeasible candidate requires a rejectionReason');
    }
    if (params.feasible && params.rejectionReason) {
      throw new Error('RouteInsertionCandidate invariant violation: feasible candidate must not carry a rejectionReason');
    }
    return new RouteInsertionCandidate({
      ...params,
      evaluatedAt: params.evaluatedAt ?? new Date(),
    });
  }

  static fromPersisted(data: RouteInsertionCandidateData): RouteInsertionCandidate {
    return new RouteInsertionCandidate({ ...data });
  }

  get id(): string { return this.data.id; }
  get shipmentId(): string { return this.data.shipmentId; }
  get deliveryJobId(): string { return this.data.deliveryJobId; }
  get marginalCostTzs(): number { return this.data.marginalCostTzs; }
  get additionalDistanceKm(): number { return this.data.additionalDistanceKm; }
  get additionalDurationMinutes(): number { return this.data.additionalDurationMinutes; }
  get feasible(): boolean { return this.data.feasible; }
  get rejectionReason(): InsertionRejectionReason { return this.data.rejectionReason; }
  get evaluatedAt(): Date { return new Date(this.data.evaluatedAt); }

  toJSON(): RouteInsertionCandidateData {
    return { ...this.data, evaluatedAt: new Date(this.data.evaluatedAt) };
  }
}
