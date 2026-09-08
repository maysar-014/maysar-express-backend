/**
 * Phase 5 repository contracts.
 *
 * RouteInsertionCandidate and DriverMatchAudit are APPEND-ONLY: implementations
 * must never expose update/delete — they are the audit trail for optimization
 * quality and dispatch decisions.
 */

import { RouteInsertionCandidate } from '../entities/route-insertion-candidate.entity';
import { DriverMatchAudit } from '../entities/driver-match-audit.entity';

export interface RouteInsertionCandidateRepository {
  /** Records one evaluation. No update/delete exists. */
  save(candidate: RouteInsertionCandidate): Promise<void>;
  findByShipmentId(shipmentId: string): Promise<RouteInsertionCandidate[]>;
  findByDeliveryJobId(deliveryJobId: string): Promise<RouteInsertionCandidate[]>;
  /** Feasible candidates not yet accepted, for retrospective analytics. */
  findFeasible(shipmentId: string): Promise<RouteInsertionCandidate[]>;
}

export interface DriverMatchAuditRepository {
  /** Records one candidate result. No update/delete exists. */
  save(audit: DriverMatchAudit): Promise<void>;
  findByDeliveryJobId(deliveryJobId: string): Promise<DriverMatchAudit[]>;
  findByDriverId(driverId: string): Promise<DriverMatchAudit[]>;
}
