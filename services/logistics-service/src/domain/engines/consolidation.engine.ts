/**
 * ConsolidationEngine
 *
 * Pure, synchronous function that groups seller pickup locations into
 * delivery groups. Each delivery group represents one physical courier
 * operation (one or more pickups → one buyer destination).
 *
 * GUARANTEES:
 * 1. Pure: no I/O, no async, no side effects
 * 2. Deterministic: identical inputs → identical output
 * 3. Partition invariant: every seller appears in exactly one group
 * 4. Proximity invariant: all seller pairs in a group satisfy haversine ≤ consolidationRadiusKm
 * 5. Weight invariant: total group weight ≤ maxGroupWeightKg
 *
 * All distances and route info must be pre-computed and passed in.
 * The caller (ConsolidationOrchestrator) is responsible for routing calls.
 */

import { GeoPoint } from '../value-objects/geopoint.value-object';
import { haversineKm, haversinePathKm } from '../services/haversine';
import { VehicleClass } from '../entities/shipment.entity';

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface SellerPickupInput {
  sellerOrderId: string;
  sellerId: string;
  pickupPoint: GeoPoint;
  packageWeightKg: number;
  /** Expected confirmation hour (0–23). If absent, time-window rule is skipped. */
  expectedConfirmHour?: number;
  /** Pre-computed road distance from this seller to the buyer (km). */
  individualRouteDistanceKm: number;
  /** Phase 2 §2.3: minimum vehicle class required by this seller's shipment. */
  requiredVehicleClass?: VehicleClass | null;
}

export interface ConsolidationConfig {
  /** Max Haversine distance between any two sellers in the same group (km). Default 5.0 */
  consolidationRadiusKm: number;
  /** Max ratio: consolidatedRouteDistance / longestIndividualRoute. Default 1.40 */
  maxConsolidatedRouteOverheadPct: number;
  /** Max combined weight in a group (kg). Default 20.0 */
  maxGroupWeightKg: number;
  allocationAlgorithm: 'weight_proportional';
}

export interface DeliveryGroupPlan {
  /** Ephemeral ID — replaced by DCG- prefixed ID when persisted */
  tempGroupId: string;
  /** Seller order IDs, ordered by pickup sequence */
  sellerOrderIds: string[];
  /** Pickup GeoPoints, ordered — furthest from buyer first */
  pickupSequence: GeoPoint[];
  totalWeightKg: number;
  consolidationBenefit: 'CONSOLIDATED' | 'SINGLETON';
}

// ─── Internal state ───────────────────────────────────────────────────────────

interface CandidateGroup {
  members: SellerPickupInput[];
  totalWeightKg: number;
  minConfirmHour?: number;
  maxConfirmHour?: number;
}

// ─── Pure consolidation function ──────────────────────────────────────────────

/**
 * Groups seller pickup inputs into delivery groups using a greedy proximity-first algorithm.
 *
 * @param sellers   Seller pickup inputs with pre-computed distances
 * @param buyer     Buyer destination GeoPoint
 * @param config    Consolidation configuration (all thresholds)
 * @returns         Array of delivery group plans (partition of all sellers)
 */
export function consolidate(
  sellers: SellerPickupInput[],
  buyer: GeoPoint,
  config: ConsolidationConfig,
): DeliveryGroupPlan[] {
  if (!sellers || sellers.length === 0) return [];
  if (sellers.length === 1) {
    return [toGroupPlan([sellers[0]], buyer, 0)];
  }

  // If consolidation disabled, return all singletons
  if (config.consolidationRadiusKm <= 0) {
    return sellers.map((s, idx) => toGroupPlan([s], buyer, idx));
  }

  // Sort by distance to buyer DESCENDING (furthest seller considered first)
  const sorted = [...sellers].sort(
    (a, b) => b.individualRouteDistanceKm - a.individualRouteDistanceKm,
  );

  const candidateGroups: CandidateGroup[] = [];

  for (const seller of sorted) {
    let assigned = false;

    for (const group of candidateGroups) {
      if (canJoinGroup(seller, group, buyer, config)) {
        group.members.push(seller);
        group.totalWeightKg += seller.packageWeightKg;
        // Update time window
        if (seller.expectedConfirmHour !== undefined) {
          group.minConfirmHour = Math.min(group.minConfirmHour ?? seller.expectedConfirmHour, seller.expectedConfirmHour);
          group.maxConfirmHour = Math.max(group.maxConfirmHour ?? seller.expectedConfirmHour, seller.expectedConfirmHour);
        }
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      candidateGroups.push({
        members: [seller],
        totalWeightKg: seller.packageWeightKg,
        minConfirmHour: seller.expectedConfirmHour,
        maxConfirmHour: seller.expectedConfirmHour,
      });
    }
  }

  // Post-assignment: route overhead check
  const finalGroups: CandidateGroup[] = [];
  for (const group of candidateGroups) {
    if (group.members.length === 1) {
      finalGroups.push(group);
      continue;
    }

    // Check route overhead
    const sequenced = sequencePickups(group.members, buyer);
    const pickupPoints = [...sequenced.map(s => s.pickupPoint), buyer];
    const combinedHaversineRoute = haversinePathKm(pickupPoints);
    const longestIndividual = Math.max(...group.members.map(s => s.individualRouteDistanceKm));

    if (combinedHaversineRoute <= longestIndividual * config.maxConsolidatedRouteOverheadPct) {
      finalGroups.push({ ...group, members: sequenced });
    } else {
      // Split: each seller becomes singleton
      for (const member of group.members) {
        finalGroups.push({ members: [member], totalWeightKg: member.packageWeightKg });
      }
    }
  }

  return finalGroups.map((group, idx) => toGroupPlan(group.members, buyer, idx));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Consolidation eligibility rule — vehicle capability compatibility (Phase 2 §2.3).
 *
 * A candidate group is only consolidated when its members can be served by a
 * single available vehicle type. Different explicit requiredVehicleClass
 * values (e.g. MOTORCYCLE + VAN) are incompatible and must not be grouped.
 * Untagged shipments (null) impose no constraint.
 */
export function canConsolidateVehicleClasses(
  classes: Array<VehicleClass | null | undefined>,
): boolean {
  const explicit = classes.filter((c): c is VehicleClass => c !== null && c !== undefined);
  return new Set(explicit).size <= 1;
}

function canJoinGroup(
  seller: SellerPickupInput,
  group: CandidateGroup,
  buyer: GeoPoint,
  config: ConsolidationConfig,
): boolean {
  // Rule 1: Proximity — all existing members must be within radius
  for (const member of group.members) {
    if (haversineKm(seller.pickupPoint, member.pickupPoint) > config.consolidationRadiusKm) {
      return false;
    }
  }

  // Rule 2: Weight capacity
  if (group.totalWeightKg + seller.packageWeightKg > config.maxGroupWeightKg) {
    return false;
  }

  // Rule 3: Time window compatibility (if data available)
  if (
    seller.expectedConfirmHour !== undefined &&
    group.minConfirmHour !== undefined &&
    group.maxConfirmHour !== undefined
  ) {
    const WINDOW_HOURS = 4;
    if (
      seller.expectedConfirmHour < group.minConfirmHour - WINDOW_HOURS ||
      seller.expectedConfirmHour > group.maxConfirmHour + WINDOW_HOURS
    ) {
      return false;
    }
  }

  // Rule 4: Vehicle capability compatibility (Phase 2 §2.3)
  // If any member of the group has an explicit requiredVehicleClass, the whole
  // group must be compatible with a single available vehicle type. Two
  // different explicit requirements (e.g. MOTORCYCLE + VAN) can never be
  // served by one vehicle — such members must not be consolidated together.
  if (!canConsolidateVehicleClasses([
    ...group.members.map(m => m.requiredVehicleClass ?? null),
    seller.requiredVehicleClass ?? null,
  ])) {
    return false;
  }

  return true;
}

/**
 * Orders sellers in a group using nearest-neighbour heuristic.
 * Starts from the seller FURTHEST from buyer (picked up first).
 * The last pickup is the seller NEAREST to buyer.
 */
function sequencePickups(sellers: SellerPickupInput[], buyer: GeoPoint): SellerPickupInput[] {
  if (sellers.length <= 1) return [...sellers];

  const unvisited = [...sellers];
  const result: SellerPickupInput[] = [];

  // Start with seller furthest from buyer
  unvisited.sort((a, b) => {
    const distA = haversineKm(a.pickupPoint, buyer);
    const distB = haversineKm(b.pickupPoint, buyer);
    return distB - distA; // descending — furthest first
  });

  result.push(unvisited.shift()!);

  // Nearest-neighbour: at each step, pick closest remaining seller to current position
  while (unvisited.length > 0) {
    const current = result[result.length - 1].pickupPoint;
    unvisited.sort((a, b) =>
      haversineKm(current, a.pickupPoint) - haversineKm(current, b.pickupPoint),
    );
    result.push(unvisited.shift()!);
  }

  return result;
}

function toGroupPlan(members: SellerPickupInput[], buyer: GeoPoint, idx: number): DeliveryGroupPlan {
  const sequenced = members.length > 1 ? sequencePickups(members, buyer) : members;
  return {
    tempGroupId: `temp-group-${idx}`,
    sellerOrderIds: sequenced.map(s => s.sellerOrderId),
    pickupSequence: sequenced.map(s => s.pickupPoint),
    totalWeightKg: sequenced.reduce((sum, s) => sum + s.packageWeightKg, 0),
    consolidationBenefit: members.length > 1 ? 'CONSOLIDATED' : 'SINGLETON',
  };
}
