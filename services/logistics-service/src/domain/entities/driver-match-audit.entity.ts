/**
 * Phase 5 §5.1 — DriverMatchAudit entity.
 * APPEND-ONLY record of one driver-candidate result from a matching run.
 * Stores the composite score AND all input factors so any assignment decision
 * can be explained after the fact (backlog §5.1: audit requirement).
 */

export interface DriverMatchScoreComponents {
  proximity: number;
  capacityHeadroom: number;
  reliability: number;
  routeFit: number;
  eta: number;
  driverEconomics: number;
}

export interface DriverMatchAuditData {
  id: string;
  deliveryJobId: string;
  driverId: string;
  vehicleId: string | null;
  vehicleType: string;
  score: number;
  eligible: boolean;
  exclusionReason: string | null;
  scoreComponents: DriverMatchScoreComponents;
  estimatedCompensationTzs: number;
  etaMinutes: number;
  distanceToPickupKm: number;
  matchedAt: Date;
}

export class DriverMatchAudit {
  private constructor(private readonly data: DriverMatchAuditData) {}

  static create(params: Omit<DriverMatchAuditData, 'matchedAt'> & { matchedAt?: Date }): DriverMatchAudit {
    if (params.estimatedCompensationTzs < 0) {
      throw new Error('DriverMatchAudit invariant violation: estimatedCompensationTzs cannot be negative');
    }
    if (!params.eligible && !params.exclusionReason) {
      throw new Error('DriverMatchAudit invariant violation: ineligible candidate requires an exclusionReason');
    }
    return new DriverMatchAudit({ ...params, matchedAt: params.matchedAt ?? new Date() });
  }

  static fromPersisted(data: DriverMatchAuditData): DriverMatchAudit {
    return new DriverMatchAudit({ ...data });
  }

  get id(): string { return this.data.id; }
  get deliveryJobId(): string { return this.data.deliveryJobId; }
  get driverId(): string { return this.data.driverId; }
  get vehicleId(): string | null { return this.data.vehicleId; }
  get vehicleType(): string { return this.data.vehicleType; }
  get score(): number { return this.data.score; }
  get eligible(): boolean { return this.data.eligible; }
  get exclusionReason(): string | null { return this.data.exclusionReason; }
  get scoreComponents(): DriverMatchScoreComponents { return { ...this.data.scoreComponents }; }
  get estimatedCompensationTzs(): number { return this.data.estimatedCompensationTzs; }
  get etaMinutes(): number { return this.data.etaMinutes; }
  get distanceToPickupKm(): number { return this.data.distanceToPickupKm; }
  get matchedAt(): Date { return new Date(this.data.matchedAt); }

  toJSON(): DriverMatchAuditData {
    return { ...this.data, scoreComponents: this.scoreComponents, matchedAt: new Date(this.data.matchedAt) };
  }
}
