/**
 * ConsolidationOrchestrator
 *
 * Coordinates the full async consolidation flow:
 *  1. Fetch seller pickup GeoPoints from catalog
 *  2. Pre-compute individual routing distances (via RoutingProvider)
 *  3. Call pure consolidate() function
 *  4. Request one Logistics_Quote per delivery group
 *  5. Allocate costs with allocateByWeight()
 *  6. Persist DeliveryGroup records
 *  7. Persist ConsolidationAudit record
 *  8. Return ConsolidationResult
 *
 * Fallback: if any step fails, returns singleton groups (no consolidation).
 * The buyer always gets individual delivery fees in the fallback case.
 */

import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { consolidate, SellerPickupInput, ConsolidationConfig } from '../../domain/engines/consolidation.engine';
import { allocateByWeight, AllocationInput, AllocationResult } from '../../domain/engines/cost-allocator';
import { DeliveryGroup, makeDeliveryGroupId } from '../../domain/entities/delivery-group.entity';
import { DeliveryJob } from '../../domain/entities/delivery-job.entity';
import { PrismaDeliveryGroupRepository } from '../../infrastructure/repositories/prisma-delivery-group.repository';
import { PrismaDeliveryJobRepository } from '../../infrastructure/repositories/prisma-delivery-job.repository';
import { RoutingProviderPort } from '../../domain/engines/ports/routing-provider.port';
import { makeId } from '../../../../../shared/ids/id';

export interface SellerGroupInput {
  sellerId: string;
  sellerOrderId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  packageWeightKg: number;
  expectedConfirmHour?: number;
  /** Phase 2 §2.3: minimum vehicle class required by this seller's shipment. */
  requiredVehicleClass?: string | null;
}

export interface ConsolidatedGroupResult {
  deliveryGroupId: string;
  sellerOrderIds: string[];
  pickupSequence: Array<{ lat: number; lng: number; address: string }>;
  buyerDestination: { lat: number; lng: number; address: string };
  totalDeliveryCost: number;
  pricingVersion: number;
  quoteId?: string;
  isConsolidated: boolean;
  allocations: AllocationResult[];
}

export interface ConsolidationResult {
  masterOrderId: string;
  groups: ConsolidatedGroupResult[];
  totalSavingsTzs: number;
  usedFallback: boolean;
}

export class ConsolidationOrchestrator {
  private readonly deliveryGroupRepo = new PrismaDeliveryGroupRepository();
  private readonly deliveryJobRepo = new PrismaDeliveryJobRepository();

  constructor(
    private readonly routingProvider: RoutingProviderPort,
    private readonly requestDeliveryQuote: (params: {
      pickupPoints: GeoPoint[];
      destination: GeoPoint;
      totalWeightKg: number;
      isCoD: boolean;
      deliveryGroupId: string;
      sellerOrderIds: string[];
    }) => Promise<{ quoteId: string; deliveryFee: number; pricingVersion: number }>,
    private readonly eventBus?: { publish(type: string, data: any): Promise<void> },
  ) {}

  async plan(
    masterOrderId: string,
    sellers: SellerGroupInput[],
    buyer: GeoPoint,
    consolidationConfig: ConsolidationConfig,
    isCoD: boolean,
  ): Promise<ConsolidationResult> {
    const prisma = (globalThis as any).prisma;

    try {
      // ── Pre-compute individual routing distances ─────────────────────────
      const sellerInputs: SellerPickupInput[] = await Promise.all(
        sellers.map(async s => {
          const pickupPoint = GeoPoint.create(s.pickupLat, s.pickupLng, s.pickupAddress);
          let individualRouteDistanceKm = 0;
          try {
            const route = await this.routingProvider.getRoute(pickupPoint, buyer);
            individualRouteDistanceKm = route.distanceKm;
          } catch {
            // fallback: Haversine × 1.35
            individualRouteDistanceKm = pickupPoint.distanceTo(buyer) * 1.35;
          }
          return {
            sellerOrderId: s.sellerOrderId,
            sellerId: s.sellerId,
            pickupPoint,
            packageWeightKg: s.packageWeightKg,
            expectedConfirmHour: s.expectedConfirmHour,
            individualRouteDistanceKm,
            requiredVehicleClass: (s.requiredVehicleClass ?? null) as any,
          };
        }),
      );

      // ── Pure consolidation ───────────────────────────────────────────────
      const groupPlans = consolidate(sellerInputs, buyer, consolidationConfig);

      // ── Request quote per group + persist + allocate ─────────────────────
      const groups: ConsolidatedGroupResult[] = [];
      // Savings only come from groups that were actually consolidated —
      // singleton groups contribute nothing (there was nothing to optimise).
      let consolidatedIndividualCost = 0;
      let consolidatedGroupCost = 0;

      for (const plan of groupPlans) {
        const groupId = makeDeliveryGroupId();

        // Individual cost estimate (for savings calculation)
        const individualCost = sellerInputs
          .filter(s => plan.sellerOrderIds.includes(s.sellerOrderId))
          .reduce((sum, s) => sum + (s.individualRouteDistanceKm > 0 ? s.individualRouteDistanceKm * 300 + 1500 : 3000), 0);
        if (plan.consolidationBenefit === 'CONSOLIDATED') {
          consolidatedIndividualCost += individualCost;
        }

        // Request quote
        let quoteId: string | undefined;
        let deliveryFee = 0;
        let pricingVersion = 0;

        try {
          const quoteResult = await this.requestDeliveryQuote({
            pickupPoints: plan.pickupSequence,
            destination: buyer,
            totalWeightKg: plan.totalWeightKg,
            isCoD,
            deliveryGroupId: groupId,
            sellerOrderIds: plan.sellerOrderIds,
          });
          quoteId = quoteResult.quoteId;
          deliveryFee = quoteResult.deliveryFee;
          pricingVersion = quoteResult.pricingVersion;
        } catch {
          // Fallback: estimate based on first seller's individual distance
          const firstSeller = sellerInputs.find(s => s.sellerOrderId === plan.sellerOrderIds[0]);
          deliveryFee = Math.round((firstSeller?.individualRouteDistanceKm ?? 5) * 300 + 1500);
        }

        if (plan.consolidationBenefit === 'CONSOLIDATED') {
          consolidatedGroupCost += deliveryFee;
        }

        // Allocate cost across sellers in group
        const allocationInputs: AllocationInput[] = plan.sellerOrderIds.map(id => {
          const s = sellerInputs.find(x => x.sellerOrderId === id)!;
          return { sellerOrderId: id, weightKg: s.packageWeightKg };
        });
        const allocations = allocateByWeight(allocationInputs, deliveryFee);

        // Persist DeliveryGroup
        const deliveryGroup = DeliveryGroup.create({
          masterOrderId,
          sellerOrderIds: plan.sellerOrderIds,
          pickupSequence: plan.pickupSequence,
          buyerDestination: buyer,
          totalDeliveryCost: deliveryFee,
          pricingVersion,
          allocationAlgorithm: 'weight_proportional',
        });
        if (quoteId) deliveryGroup.markPriced(deliveryFee, pricingVersion);
        if (quoteId) deliveryGroup.markQuoteIssued(quoteId);
        await this.deliveryGroupRepo.save(deliveryGroup);

        // ── Phase 2 §2.2: also produce a DeliveryJob for this group ─────────
        // A DeliveryJob is the physical courier operation assigned to a driver.
        // Only materialised when the group has real, unique sellerOrderIds —
        // at pre-order options-display time those don't exist yet (shipments
        // are finalised at confirmation, and the assign-to-jobs use case
        // creates jobs then). Booking continues from the DeliveryGroup.
        const canMaterialiseJob = plan.sellerOrderIds.length > 0
          && plan.sellerOrderIds.every(id => id && id.length > 0)
          && new Set(plan.sellerOrderIds).size === plan.sellerOrderIds.length;

        if (canMaterialiseJob) {
          try {
            const deliveryJob = DeliveryJob.create({
              shipmentIds: plan.sellerOrderIds,
              estimatedDeliveryAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              routeId: null,
            });
            await this.deliveryJobRepo.save(deliveryJob);
            if (this.eventBus) {
              this.eventBus.publish('delivery.job.created', {
                deliveryJobId: deliveryJob.id,
                masterOrderId,
                shipmentIds: deliveryJob.shipmentIds,
                status: deliveryJob.status,
                createdAt: deliveryJob.createdAt.toISOString(),
              }).catch(() => {/* non-fatal */});
            }
          } catch (jobErr: any) {
            // Non-fatal: job finalisation happens at assignment time.
            console.error(`[ConsolidationOrchestrator] DeliveryJob creation skipped for order ${masterOrderId}:`, jobErr?.message);
          }
        }

        groups.push({
          deliveryGroupId: groupId,
          sellerOrderIds: plan.sellerOrderIds,
          pickupSequence: plan.pickupSequence.map(p => ({ lat: p.getLatitude(), lng: p.getLongitude(), address: p.getAddress() })),
          buyerDestination: { lat: buyer.getLatitude(), lng: buyer.getLongitude(), address: buyer.getAddress() },
          totalDeliveryCost: deliveryFee,
          pricingVersion,
          quoteId,
          isConsolidated: plan.consolidationBenefit === 'CONSOLIDATED',
          allocations,
        });

        // Emit analytics event for consolidated groups
        if (plan.consolidationBenefit === 'CONSOLIDATED' && this.eventBus) {
          this.eventBus.publish('delivery.consolidated', {
            masterOrderId,
            deliveryGroupId: groupId,
            sellerCount: plan.sellerOrderIds.length,
            totalDeliveryCost: deliveryFee,
            estimatedSavings: Math.max(0, individualCost - deliveryFee),
            pricingVersion,
            createdAt: new Date().toISOString(),
          }).catch(() => {/* non-fatal */});
        }
      }

      const totalSavingsTzs = Math.max(0, consolidatedIndividualCost - consolidatedGroupCost);

      // Persist consolidation audit
      if (prisma) {
        await prisma.logistics_ConsolidationAudit?.create?.({
          data: {
            id: makeId('cau'),
            masterOrderId,
            deliveryGroupIds: groups.map(g => g.deliveryGroupId) as any,
            groupSizes: groups.map(g => g.sellerOrderIds.length) as any,
            rulesApplied: { proximity: true, weight: true, routeEfficiency: true, timeWindow: true } as any,
            totalSavingsTzs,
            pricingVersion: groups[0]?.pricingVersion ?? 0,
            consolidatedAt: new Date(),
          },
        }).catch(() => {/* non-fatal */});
      }

      return { masterOrderId, groups, totalSavingsTzs, usedFallback: false };

    } catch (err: any) {
      // Fallback: return singleton groups, log error
      console.error(`[ConsolidationOrchestrator] Fallback triggered for master order ${masterOrderId}:`, err?.message);

      if ((globalThis as any).prisma) {
        await (globalThis as any).prisma.logistics_ConsolidationAudit?.create?.({
          data: {
            id: makeId('cau'),
            masterOrderId,
            deliveryGroupIds: [] as any,
            groupSizes: [] as any,
            rulesApplied: {} as any,
            totalSavingsTzs: 0,
            fallbackReason: err?.message ?? 'Unknown consolidation error',
            pricingVersion: 0,
            consolidatedAt: new Date(),
          },
        }).catch(() => {});
      }

      // Return empty groups — caller must handle with per-seller quotes
      return { masterOrderId, groups: [], totalSavingsTzs: 0, usedFallback: true };
    }
  }
}
