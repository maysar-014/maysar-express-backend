/**
 * GetDeliveryOptionsUseCase
 *
 * Called when the buyer views delivery options during checkout.
 * Runs consolidation BEFORE generating quotes so buyers see group fees.
 *
 * Flow:
 *  1. Load session items
 *  2. Look up seller pickup locations from catalog
 *  3. Run ConsolidationOrchestrator.plan()
 *  4. Return delivery groups with fees for buyer display
 *  5. Store group → quoteId mapping on session for confirmation step
 */

export interface SellerPickupInfo {
  sellerId: string;
  sellerOrderId?: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupAddress?: string;
  packageWeightKg: number;
}

export interface DeliveryGroupOption {
  groupId: string;
  sellerCount: number;
  fee: number;
  currency: 'TZS';
  label: string;        // e.g. "2-seller pickup" or "Seller delivery"
  quoteId?: string;
  isConsolidated: boolean;
}

export interface DeliveryOptionsResult {
  groups: DeliveryGroupOption[];
  totalDeliveryFee: number;
  consolidationSavingsTzs: number;
}

export class GetDeliveryOptionsUseCase {
  async execute(
    sessionId: string,
    buyerLat?: number,
    buyerLng?: number,
    buyerAddress?: string,
    buyerAddressId?: string,
  ): Promise<DeliveryOptionsResult> {
    const prisma = (globalThis as any).prisma;
    const consolidationOrchestrator = (globalThis as any).__consolidationOrchestrator;

    if (!prisma || !consolidationOrchestrator) {
      return { groups: [], totalDeliveryFee: 0, consolidationSavingsTzs: 0 };
    }

    const session = await prisma.checkout_CheckoutSession?.findUnique?.({ where: { id: sessionId } });
    if (!session) return { groups: [], totalDeliveryFee: 0, consolidationSavingsTzs: 0 };

    // Resolve buyer coordinates from address ID if lat/lng not provided
    let resolvedLat = buyerLat;
    let resolvedLng = buyerLng;
    let resolvedAddress = buyerAddress ?? 'Dar es Salaam, Tanzania';

    if ((!resolvedLat || !resolvedLng) && buyerAddressId) {
      // Look up address from user's saved addresses
      const userAddress = await prisma.user_UserAddress?.findFirst?.({
        where: { id: buyerAddressId },
        select: { street: true, ward: true, district: true, city: true, region: true, country: true, latitude: true, longitude: true },
      });
      if (userAddress) {
        resolvedAddress = [userAddress.street, userAddress.ward ?? userAddress.city, userAddress.district, userAddress.region, userAddress.country]
          .filter(Boolean).join(', ');
        if (userAddress.latitude && userAddress.longitude) {
          resolvedLat = Number(userAddress.latitude);
          resolvedLng = Number(userAddress.longitude);
        }
      }
    }

    // Fallback coordinates for Dar es Salaam city centre if none available
    if (!resolvedLat || !resolvedLng) {
      resolvedLat = -6.7924;
      resolvedLng = 39.2083;
      // Note: delivery fee will be approximate — buyer should provide coordinates
    }

    const items: any[] = session.metadata?.items || session.items || [];
    if (!items.length) return { groups: [], totalDeliveryFee: 0, consolidationSavingsTzs: 0 };

    // Look up seller pickup locations from catalog — use actual Catalog_SellerLocation
    const sellerGroupMap = new Map<string, SellerPickupInfo>();
    for (const item of items) {
      const product = await prisma.product?.findUnique?.({
        where: { id: item.productId },
        select: { sellerId: true },
      });
      if (!product?.sellerId) continue;
      const existing = sellerGroupMap.get(product.sellerId);
      const weight = (item.weight ?? 0.5) * (item.quantity ?? 1);

      if (existing) {
        existing.packageWeightKg += weight;
      } else {
        // Try to resolve the actual pickup location for this seller
        let pickupLat = resolvedLat!;
        let pickupLng = resolvedLng!;
        let pickupAddress = resolvedAddress;

        try {
          // Find primary or closest active location for this seller
          const sellerLocation = await prisma.catalog_SellerLocation?.findFirst?.({
            where: { sellerId: product.sellerId, isActive: true, status: 'ACTIVE' },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          });
          if (sellerLocation) {
            pickupLat = Number(sellerLocation.latitude);
            pickupLng = Number(sellerLocation.longitude);
            const addrParts = [
              sellerLocation.street,
              sellerLocation.ward,
              sellerLocation.district,
              sellerLocation.region,
              sellerLocation.country,
            ].filter(Boolean);
            pickupAddress = addrParts.join(', ');
          }
        } catch { /* non-fatal — fallback to buyer coords */ }

        sellerGroupMap.set(product.sellerId, {
          sellerId: product.sellerId,
          packageWeightKg: weight,
          pickupLat,
          pickupLng,
          pickupAddress,
        });
      }
    }

    const sellers = Array.from(sellerGroupMap.values());
    const pricingConfig = await prisma.logistics_PricingConfig?.findFirst?.({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });

    const config = {
      consolidationRadiusKm: Number(pricingConfig?.consolidationRadiusKm ?? 5),
      maxConsolidatedRouteOverheadPct: Number(pricingConfig?.maxConsolidatedRouteOverheadPct ?? 1.4),
      maxGroupWeightKg: Number(pricingConfig?.maxGroupWeightKg ?? 20),
      allocationAlgorithm: 'weight_proportional' as const,
    };

    const { GeoPoint } = await import('@logistics/domain/value-objects/geopoint.value-object').catch(() =>
      ({ GeoPoint: null }),
    );

    if (!GeoPoint) return { groups: [], totalDeliveryFee: 0, consolidationSavingsTzs: 0 };

    const buyer = GeoPoint.create(resolvedLat!, resolvedLng!, resolvedAddress);

    let consolidationResult: Awaited<ReturnType<typeof consolidationOrchestrator.plan>>;
    try {
      consolidationResult = await consolidationOrchestrator.plan(
        session.id,
        sellers,
        buyer,
        config,
        session.paymentMethodId?.toUpperCase() === 'COD',
      );
    } catch (err) {
      // Consolidation must never break the buyer's delivery options view.
      // The client falls back to the per-seller quote flow.
      console.error('[GetDeliveryOptionsUseCase] Consolidation failed:', (err as Error)?.message);
      return { groups: [], totalDeliveryFee: 0, consolidationSavingsTzs: 0 };
    }

    if (consolidationResult.usedFallback) {
      return { groups: [], totalDeliveryFee: 0, consolidationSavingsTzs: 0 };
    }

    // Store delivery groups on session
    const deliveryGroupsMap: Record<string, any> = {};
    for (const g of consolidationResult.groups) {
      deliveryGroupsMap[g.deliveryGroupId] = {
        quoteId: g.quoteId,
        sellerOrderIds: g.sellerOrderIds,
        totalCost: g.totalDeliveryCost,
      };
    }
    await prisma.checkout_CheckoutSession?.update?.({
      where: { id: sessionId },
      data: { deliveryGroups: deliveryGroupsMap as any },
    });

    const groups: DeliveryGroupOption[] = consolidationResult.groups.map((g: any) => ({
      groupId: g.deliveryGroupId,
      sellerCount: g.sellerOrderIds.length,
      fee: g.totalDeliveryCost,
      currency: 'TZS',
      label: g.isConsolidated ? `${g.sellerOrderIds.length}-seller pickup` : 'Seller delivery',
      quoteId: g.quoteId,
      isConsolidated: g.isConsolidated,
    }));

    const totalDeliveryFee = groups.reduce((sum, g) => sum + g.fee, 0);

    return {
      groups,
      totalDeliveryFee,
      consolidationSavingsTzs: consolidationResult.totalSavingsTzs,
    };
  }
}
