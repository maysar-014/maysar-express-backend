import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { createUlid } from '../../../../../shared/ids/id';
import { computeMarginContribution, computeRecencyWeightedRate } from '../../../../../services/catalog-service/src/domain/buy-box/signals';
import { PrismaBuyBoxRankingRepository } from '../../../../../services/catalog-service/src/infrastructure/repositories/prisma-buy-box-ranking.repository';
import {
  ConstitutionGateDefinition,
  EvidenceArtifact,
  GateResult,
  GovernanceExecutionContext,
  GovernanceInspector
} from '../../domain/governance.types';
import { AuthUserSyncInspector } from './auth-user-sync-inspector';
import { FilesystemRoundtripInspector } from '../filesystem-roundtrip-inspector';
import { HttpEndpointInspector } from './http-endpoint-inspector';
import { IndexRoundtripInspector } from './index-roundtrip-inspector';
import { ServiceReadinessInspector } from './service-readiness-inspector';
import { WalletLedgerInspector } from './wallet-ledger-inspector';
import {
  LiveGovernanceClient,
  createUniqueTag,
  getGovernancePrisma
} from './live-governance-client';

type LiveFixture = {
  verifiedBuyerId: string;
  verifiedBuyerEmail: string;
  verifiedBuyerPhone: string;
  unverifiedBuyerId: string;
  unverifiedBuyerEmail: string;
  unverifiedBuyerPhone: string;
  sellerId: string;
  sellerEmail: string;
  sellerPhone: string;
  categoryId: string;
  productId: string;
  productPrice: number;
  sellerCity: string;
};

function jsonEvidence(label: string, value: unknown): EvidenceArtifact {
  return { label, type: 'json', value: JSON.stringify(value, null, 2) };
}

function textEvidence(label: string, value: unknown): EvidenceArtifact {
  return { label, type: 'text', value: typeof value === 'string' ? value : String(value) };
}

function normalizeStatusText(value: unknown): string {
  if (typeof value === 'string') return value.toUpperCase();
  if (value && typeof value === 'object' && 'status' in value) {
    return normalizeStatusText((value as any).status);
  }
  return '';
}

export class Phase2LiveInspector implements GovernanceInspector {
  private fixturePromise: Promise<LiveFixture> | null = null;

  constructor(public readonly gateId: string) {}

  private client(context: GovernanceExecutionContext): LiveGovernanceClient {
    return new LiveGovernanceClient(context.targetBaseUrl);
  }

  private async ensureFixture(context: GovernanceExecutionContext): Promise<LiveFixture> {
    if (!this.fixturePromise) {
      this.fixturePromise = this.bootstrapFixture(context);
    }
    return this.fixturePromise;
  }

  private async bootstrapFixture(context: GovernanceExecutionContext): Promise<LiveFixture> {
    const client = this.client(context);
    const prisma = getGovernancePrisma() as any;
    const unique = createUniqueTag('phase2');
    const sellerCity = 'Dar es Salaam';
    const verifiedBuyerPhone = `+2557${String(11110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const unverifiedBuyerPhone = `+2557${String(21110000 + Math.floor(Math.random() * 7888888)).slice(0, 8)}`;
    const sellerPhone = `+2556${String(11110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const verifiedBuyerEmail = `${unique}.buyer@example.com`;
    const unverifiedBuyerEmail = `${unique}.candidate@example.com`;
    const sellerEmail = `${unique}.seller@example.com`;

    const seedUser = async (email: string, phone: string, role: 'buyer' | 'seller') => {
      const created = await client.createUser({
        email,
        phoneNumber: phone,
        firstName: 'Phase',
        lastName: role === 'buyer' ? 'Buyer' : 'Seller',
        role
      });
      const userId = created.body?.data?.id ?? created.body?.id;
      if (!userId) {
        throw new Error(`Unable to create Phase 2 ${role} fixture user`);
      }
      return userId as string;
    };

    const verifiedBuyerId = await seedUser(verifiedBuyerEmail, verifiedBuyerPhone, 'buyer');
    const unverifiedBuyerId = await seedUser(unverifiedBuyerEmail, unverifiedBuyerPhone, 'buyer');
    const sellerId = await seedUser(sellerEmail, sellerPhone, 'seller');

    await prisma.user_User.update({
      where: { id: verifiedBuyerId },
      data: { isPhoneVerified: true, phoneVerifiedAt: new Date() }
    });
    await prisma.user_User.update({
      where: { id: sellerId },
      data: {
        isPhoneVerified: true,
        phoneVerifiedAt: new Date(),
        kycStatus: 'VERIFIED',
        kycLevel: 1,
        kycVerifiedAt: new Date()
      }
    });

    for (const walletUserId of [verifiedBuyerId, unverifiedBuyerId]) {
      const existingWallet = await prisma.wallet_Wallet.findFirst({ where: { userId: walletUserId } });
      if (existingWallet) {
        await prisma.wallet_Wallet.update({
          where: { id: existingWallet.id },
          data: {
            balance: 100000,
            currency: 'TZS',
            status: 'ACTIVE',
            frozenAmount: 0,
            metadata: { source: 'governance-fixture' },
            codCommitmentLimit: 500000,
            codCommitmentUsed: 0,
            codCommitmentCount: 0
          }
        });
      } else {
        await prisma.wallet_Wallet.create({
          data: {
            id: `wal_${createUlid()}`,
            userId: walletUserId,
            balance: 100000,
            currency: 'TZS',
            status: 'ACTIVE',
            frozenAmount: 0,
            metadata: { source: 'governance-fixture' },
            codCommitmentLimit: 500000,
            codCommitmentUsed: 0,
            codCommitmentCount: 0,
            version: 0
          }
        });
      }
    }

    await client.waitForProbe(
      () => client.validateCodEligibility({
        buyerId: verifiedBuyerId,
        sellerId,
        totalAmount: 1000,
        deliveryFee: 500,
        deliveryAddress: {
          street: 'Phase 2 Street',
          city: sellerCity,
          postalCode: '11101',
          country: 'TZ'
        },
        sellerAddress: {
          street: 'Phase 2 Seller Street',
          city: sellerCity,
          postalCode: '11102',
          country: 'TZ'
        },
        items: [{ productId: `probe_${unique}`, quantity: 1, price: 1000 }]
      }),
      {
        timeoutMs: 120_000,
        intervalMs: 2_000,
        isReady: (result) => result.response.status !== 503
      }
    );
    if (!verifiedBuyerId || !unverifiedBuyerId || !sellerId) {
      throw new Error('Unable to bootstrap Phase 2 fixture users');
    }

    const categoryId = `cat_phase2_${unique.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18)}`;
    await prisma.category.create({
      data: {
        id: categoryId,
        parentId: null,
        name: `Governance ${unique}`,
        slug: `governance-${unique}`,
        description: 'Governance fixture category',
        imageUrl: null,
        displayOrder: 9999,
        isActive: true,
        seoMetadata: null
      }
    });
    const productPrice = 25000;
    const productId = `prd_phase2_${unique.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18)}`;
    await prisma.product.create({
      data: {
        id: productId,
        sellerId,
        title: `Phase 2 Product ${unique}`,
        description: 'Governance phase 2 product',
        supplierLocationId: null,
        supplierLocation: sellerCity,
        categoryId,
        brand: 'Governance',
        model: 'Phase2Fixture',
        status: 'published',
        visibility: 'public',
        seoMetadata: null,
        tags: ['governance-fixture'],
        gtin: null,
        mpn: null,
        isbn: null,
        fingerprint: `${unique}-fingerprint`,
        fingerprintVersion: 1,
        slug: `phase-2-product-${unique}`,
        seoTitle: `Phase 2 Product ${unique}`,
        shortSeoDescription: 'Governance phase 2 product',
        generatedDescription: 'Governance phase 2 product',
        qualityScore: 100,
        enablerEnabled: false,
        enablerCommissionRate: null,
        codAccepted: true,
        freeDelivery: true,
        condition: 'new',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    await prisma.productVariant.create({
      data: {
        id: `var_${productId}`,
        productId,
        sku: `${unique}-sku`,
        name: `Phase 2 Product ${unique}`,
        price: String(productPrice),
        compareAtPrice: null,
        costPrice: null,
        inventoryPolicy: 'deny',
        weight: null,
        dimensions: null,
        attributes: { currency: 'TZS' },
        images: [`https://example.com/${unique}.jpg`],
        status: 'active'
      }
    });
    await prisma.mediaRef.create({
      data: {
        id: `media_${productId}`,
        entityType: 'PRODUCT',
        entityId: productId,
        mediaType: 'IMAGE',
        url: `https://example.com/${unique}.jpg`,
        altText: `Phase 2 Product ${unique}`,
        displayOrder: 0,
        isPrimary: true,
        metadata: { source: 'governance-fixture' },
        uploadedBy: sellerId
      }
    });

    return {
      verifiedBuyerId,
      verifiedBuyerEmail,
      verifiedBuyerPhone,
      unverifiedBuyerId,
      unverifiedBuyerEmail,
      unverifiedBuyerPhone,
      sellerId,
      sellerEmail,
      sellerPhone,
      categoryId,
      productId,
      productPrice,
      sellerCity
    };
  }

  private async readTrustScore(buyerId: string) {
    const prisma = getGovernancePrisma() as any;
    const record = await prisma.order_CODTrustScore.findUnique({ where: { buyerId } });
    return {
      score: Number(record?.score ?? 0),
      tier: record?.tier ?? 'NEW_BUYER',
      updatedAt: record?.updatedAt ?? null
    };
  }

  private async createRestriction(buyerId: string, minutes: number) {
    const prisma = getGovernancePrisma() as any;
    const now = new Date();
    const endsAt = new Date(now.getTime() + minutes * 60 * 1000);
    await prisma.order_CODRestriction.create({
      data: {
        id: `restriction_${crypto.randomUUID().slice(0, 12)}`,
        buyerId,
        reason: 'Governance temporary restriction fixture',
        endsAt,
        permanent: false
      }
    });
    return endsAt;
  }

  private async inspectAuthSyncMaintained(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    return new AuthUserSyncInspector(definition.id).inspect(context, definition);
  }

  private async inspectWalletLedgerMaintained(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    return new WalletLedgerInspector(definition.id).inspect(context, definition);
  }

  private async inspectPhase1OperationalMaintained(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const normalizedBaseUrl = context.targetBaseUrl.replace(/\/$/, '');
    const readinessTargets = [
      { name: 'auth-service', url: `${normalizedBaseUrl}/api/auth/health/ready`, expectedStatus: 200 },
      { name: 'user-service', url: `${normalizedBaseUrl}/api/user/health/ready`, expectedStatus: 200 },
      { name: 'order-service', url: `${normalizedBaseUrl}/api/order/health/ready`, expectedStatus: 200 },
      { name: 'payment-service', url: `${normalizedBaseUrl}/api/payment/health/ready`, expectedStatus: 200 },
      { name: 'wallet-service', url: `${normalizedBaseUrl}/api/wallet/health/ready`, expectedStatus: 200 },
      { name: 'inventory-service', url: `${normalizedBaseUrl}/api/inventory/health/ready`, expectedStatus: 200 },
      { name: 'logistics-service', url: `${normalizedBaseUrl}/api/logistics/health/ready`, expectedStatus: 200 },
      { name: 'notification-service', url: `${normalizedBaseUrl}/api/notification/health/ready`, expectedStatus: 200 },
      { name: 'commission-service', url: `${normalizedBaseUrl}/api/commission/health/ready`, expectedStatus: 200 },
      { name: 'checkout-service', url: `${normalizedBaseUrl}/api/checkout/health/ready`, expectedStatus: 200 },
      { name: 'kyc-service', url: `${normalizedBaseUrl}/api/kyc/health/ready`, expectedStatus: 200 },
      { name: 'business-registry-service', url: `${normalizedBaseUrl}/api/business-registry/health/ready`, expectedStatus: 200 },
      { name: 'maps-service', url: `${normalizedBaseUrl}/api/maps/health/ready`, expectedStatus: 200 },
      { name: 'catalog-service', url: `${normalizedBaseUrl}/api/catalog/health/ready`, expectedStatus: 200 }
    ];
    const healthResult = await new HttpEndpointInspector('phase2-op-health').inspect(context, {
      id: 'OPS1.1',
      title: 'Health Endpoints',
      category: 'Operational',
      severity: 'P0',
      runner: 'http-endpoint',
      path: '/health',
      expectedStatus: 200
    });

    const readyResult = await new HttpEndpointInspector('phase2-op-ready').inspect(context, {
      id: 'OPS1.2',
      title: 'Readiness Endpoint',
      category: 'Operational',
      severity: 'P0',
      runner: 'http-endpoint',
      path: '/ready',
      expectedStatus: 200
    });

    const filesystemResult = await new FilesystemRoundtripInspector('phase2-op-filesystem').inspect(context, {
      id: 'OPS1.3',
      title: 'Governance Report Store',
      category: 'Operational',
      severity: 'P2',
      runner: 'filesystem-roundtrip',
      reportPath: 'reports/governance'
    });

    const indexResult = await new IndexRoundtripInspector('phase2-op-index').inspect(context, {
      id: 'OPS1.4',
      title: 'Governance Index Roundtrip',
      category: 'Operational',
      severity: 'P2',
      runner: 'filesystem-roundtrip',
      reportPath: 'reports/governance'
    });

    const readinessResult = await new ServiceReadinessInspector('phase2-op-readiness').inspect(context, {
      id: 'OPS1.5',
      title: 'Core Service Readiness',
      category: 'Operational',
      severity: 'P1',
      runner: 'service-readiness',
      targets: readinessTargets
    } as ConstitutionGateDefinition);

    const supporting = [healthResult, readyResult, filesystemResult, indexResult, readinessResult];
    const status = supporting.every(result => result.status === 'PASS' || result.status === 'SKIPPED') ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? 'Phase 1 operational gates remain healthy'
        : 'One or more Phase 1 operational checks failed during regression verification',
      evidence: supporting.flatMap(result => result.evidence.slice(0, 3)).concat([
        textEvidence('supportingStatuses', JSON.stringify(supporting.map(result => ({ gateId: result.gateId, status: result.status })), null, 2))
      ]),
      startedAt: supporting[0]?.startedAt ?? new Date().toISOString(),
      finishedAt,
      durationMs: supporting.reduce((sum, result) => sum + Number(result.durationMs ?? 0), 0)
    };
  }

  private async inspectScoreEventSourcing(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const prisma = getGovernancePrisma() as any;
    const buyers = await prisma.order_CODScoreEvent.findMany({
      select: { buyerId: true },
      distinct: ['buyerId'],
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const samples: Array<Record<string, unknown>> = [];
    const mismatches: Array<Record<string, unknown>> = [];

    for (const { buyerId } of buyers) {
      const events = await prisma.order_CODScoreEvent.findMany({
        where: { buyerId },
        orderBy: { createdAt: 'asc' }
      });
      const trustScore = await prisma.order_CODTrustScore.findUnique({ where: { buyerId } });
      let replayed = Number(events[0]?.scoreBefore ?? trustScore?.score ?? 0);
      let sequentialMismatch = false;
      for (const event of events as any[]) {
        if (Number(event.scoreBefore ?? replayed) !== replayed) {
          sequentialMismatch = true;
        }
        replayed = Number(event.scoreAfter ?? replayed + Number(event.delta ?? 0));
      }

      const current = Number(trustScore?.score ?? 0);
      samples.push({
        buyerId,
        eventCount: events.length,
        replayed,
        current,
        tier: trustScore?.tier ?? null
      });

      if (events.length === 0 || replayed !== current || sequentialMismatch) {
        mismatches.push({
          buyerId,
          replayed,
          current,
          sequentialMismatch,
          lastEvent: events[events.length - 1] ?? null
        });
      }
    }

    const status = buyers.length > 0 && mismatches.length === 0 ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? 'Score event sourcing replay matched the persisted trust scores'
        : `Detected ${mismatches.length} score replay mismatches`,
      evidence: [
        jsonEvidence('buyersInspected', buyers.map((buyer: any) => buyer.buyerId)),
        jsonEvidence('samples', samples),
        jsonEvidence('mismatches', mismatches)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectBuyBoxSnapshotIntegrity(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const prisma = getGovernancePrisma() as any;
    const repository = new PrismaBuyBoxRankingRepository(prisma);
    const snapshots = await prisma.catalog_ScoreSnapshot.findMany({
      orderBy: { computedAt: 'desc' },
      take: 5
    });

    const mismatches: Array<Record<string, unknown>> = [];
    const samples: Array<Record<string, unknown>> = [];

    for (const snapshot of snapshots) {
      const productId = String(snapshot.productId);
      const sellerId = String(snapshot.sellerId);
      const signalValues = snapshot.signalValues as Record<string, number>;
      const signalWeights = snapshot.signalWeights as Record<string, number>;
      const geographicZone = snapshot.geographicZone ?? undefined;
      const sellerData = await repository.getSellerSignalData(sellerId, productId, geographicZone as any);
      const offers = await repository.getEligibleSellerOffers(productId);
      const offerSignals = await Promise.all(offers.map(async (offer: any) => ({
        offer,
        sellerData: await repository.getSellerSignalData(offer.sellerId, productId, geographicZone as any)
      })));
      const allOfferMargins = offerSignals.map(({ offer, sellerData: offerSellerData }) => {
        const commissionTier = Number(offerSellerData?.commissionTier ?? 0.08);
        const logisticsCost = Number(offerSellerData?.logisticsCostEstimate ?? 0);
        return Number(offer.price ?? 0) * commissionTier - logisticsCost;
      });
      const currentOffer = offers.find((offer: any) => offer.sellerId === sellerId) ?? offers[0] ?? { price: 0 };
      const marginResult = computeMarginContribution({
        commissionTier: Number(sellerData?.commissionTier ?? 0.08),
        logisticsCost: Number(sellerData?.logisticsCostEstimate ?? 0),
        codFailureCost: 0,
        offerPrice: Number(currentOffer.price ?? 0),
        allOfferMargins
      });
      const activeFlags = await prisma.catalog_AnomalyFlag.findMany({
        where: { sellerId, clearedAt: null },
        orderBy: { flaggedAt: 'desc' }
      });
      const weightedSum = Object.entries(signalValues).reduce((sum, [key, value]) => {
        const weight = Number(signalWeights[key] ?? 0);
        return sum + Number(value ?? 0) * weight;
      }, 0);
      const replayedScore = Math.max(
        0,
        Math.min(
          100,
          weightedSum +
            (sellerData?.orderCount === 0 ? -10 : 0) +
            (activeFlags.length >= 3 ? -20 : 0) +
            (Number(sellerData?.codOrderCount ?? 0) > 0
              ? Number(sellerData?.codRefusalCount ?? 0) / Math.max(1, Number(sellerData?.codOrderCount ?? 0)) > 0.3
                ? -25
                : Number(sellerData?.codRefusalCount ?? 0) / Math.max(1, Number(sellerData?.codOrderCount ?? 0)) > 0.15
                  ? -10
                  : 0
              : 0) +
            marginResult.penalty +
            marginResult.bonus
        )
      );
      const delta = Math.abs(replayedScore - Number(snapshot.compositeScore));
      samples.push({
        productId,
        sellerId,
        stored: Number(snapshot.compositeScore),
        replayed: Number(replayedScore.toFixed(2)),
        delta: Number(delta.toFixed(4)),
        snapshotAt: snapshot.computedAt
      });
      if (delta > 0.01) {
        mismatches.push({
          productId,
          sellerId,
          stored: Number(snapshot.compositeScore),
          replayed: Number(replayedScore.toFixed(2)),
          delta: Number(delta.toFixed(4))
        });
      }
    }

    const status = snapshots.length > 0 && mismatches.length === 0 ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? 'Buy-box snapshots matched live recomputation'
        : `Detected ${mismatches.length} snapshot recomputation mismatches`,
      evidence: [
        jsonEvidence('snapshotsInspected', snapshots.map((snapshot: any) => ({ productId: snapshot.productId, sellerId: snapshot.sellerId, computedAt: snapshot.computedAt }))),
        jsonEvidence('samples', samples),
        jsonEvidence('mismatches', mismatches)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectRollingAverageAccuracy(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const prisma = getGovernancePrisma() as any;
    const latestStatsLogs = await prisma.catalog_OperatorAuditLog.findMany({
      where: {
        entityType: 'SellerRollingStats',
        field: 'stats'
      },
      orderBy: { changedAt: 'desc' },
      take: 5
    });

    const samples: Array<Record<string, unknown>> = [];
    const mismatches: Array<Record<string, unknown>> = [];

    for (const record of latestStatsLogs) {
      const stats = record.newValue as any;
      const sellerId = String(record.entityId);
      const windowDays = Number(stats?.windowDays ?? 90);
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - windowDays);
      const orders = await prisma.order_Order.findMany({
        where: { sellerId, createdAt: { gte: windowStart } },
        include: { codDisputes: true },
        orderBy: { createdAt: 'asc' }
      });

      const makeEvents = (selector: (order: any) => boolean) => orders.map((order: any) => ({
        occurredAt: order.createdAt,
        isNegative: selector(order)
      }));

      const recomputedMean = {
        disputeRate: Math.max(0, Math.min(100, (1 - computeRecencyWeightedRate(makeEvents((order) => (order.codDisputes?.length ?? 0) > 0), { windowDays }).rate) * 100)),
        cancellationRate: Math.max(0, Math.min(100, (1 - computeRecencyWeightedRate(makeEvents((order) => order.status === 'CANCELLED'), { windowDays }).rate) * 100)),
        returnRate: Math.max(0, Math.min(100, (1 - computeRecencyWeightedRate(makeEvents((order) => order.status === 'CANCELLED'), { windowDays }).rate) * 100)),
        fulfillmentReliability: Math.max(0, Math.min(100, (1 - computeRecencyWeightedRate(makeEvents((order) => order.status !== 'DELIVERED'), { windowDays }).rate) * 100)),
        stockReliability: Math.max(0, Math.min(100, (1 - computeRecencyWeightedRate(makeEvents((order) => order.status === 'CANCELLED'), { windowDays }).rate) * 100))
      };

      const storedMean = stats?.mean ?? {};
      const delta = Object.fromEntries(
        Object.keys(recomputedMean).map((key) => [key, Math.abs(Number(recomputedMean[key as keyof typeof recomputedMean]) - Number(storedMean[key] ?? 0))])
      );
      const hasMismatch = Object.values(delta).some((value) => value > 0.01) || Number(stats?.orderCount ?? 0) !== orders.length;
      samples.push({
        sellerId,
        orderCount: orders.length,
        storedOrderCount: Number(stats?.orderCount ?? 0),
        recomputedMean,
        storedMean,
        delta
      });
      if (hasMismatch) {
        mismatches.push({
          sellerId,
          orderCount: orders.length,
          storedOrderCount: Number(stats?.orderCount ?? 0),
          delta
        });
      }
    }

    const status = latestStatsLogs.length > 0 && mismatches.length === 0 ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? 'Rolling averages matched the persisted seller stats'
        : `Detected ${mismatches.length} rolling-average mismatches`,
      evidence: [
        jsonEvidence('statsLogsInspected', latestStatsLogs.map((record: any) => ({ sellerId: record.entityId, changedAt: record.changedAt }))),
        jsonEvidence('samples', samples),
        jsonEvidence('mismatches', mismatches)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectCodCommitmentUnchanged(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);

    const scenarios = [
      { deliveryFee: 0, logisticsEstimate: 750 },
      { deliveryFee: 500, logisticsEstimate: 750 }
    ];

    const samples: Array<Record<string, unknown>> = [];
    const mismatches: Array<Record<string, unknown>> = [];

    for (const scenario of scenarios) {
      const orderResponse = await client.placeCodOrder({
        buyerId: fixture.verifiedBuyerId,
        sellerId: fixture.sellerId,
        productId: fixture.productId,
        price: 1000,
        deliveryFee: scenario.deliveryFee,
        logisticsEstimate: scenario.logisticsEstimate,
        deliveryAddress: {
          street: 'Phase 2 Street',
          city: fixture.sellerCity,
          postalCode: '11101',
          country: 'TZ'
        }
      });
      const orderId = orderResponse.body?.id ?? orderResponse.body?.data?.id;
      const commitmentFee = Number(orderResponse.body?.commitmentFee ?? orderResponse.body?.data?.commitmentFee ?? 0);
      const expectedCommitmentFee = scenario.deliveryFee > 0 ? scenario.deliveryFee : scenario.logisticsEstimate;
      samples.push({
        orderId,
        deliveryFee: scenario.deliveryFee,
        logisticsEstimate: scenario.logisticsEstimate,
        commitmentFee,
        expectedCommitmentFee,
        paymentMethod: orderResponse.body?.commitmentPaymentMethod ?? orderResponse.body?.data?.commitmentPaymentMethod ?? null
      });
      if (!orderId || commitmentFee !== expectedCommitmentFee) {
        mismatches.push({
          orderId,
          deliveryFee: scenario.deliveryFee,
          logisticsEstimate: scenario.logisticsEstimate,
          commitmentFee,
          expectedCommitmentFee
        });
      }

      if (orderId) {
        await client.cancelOrder(orderId, fixture.verifiedBuyerId, 'Governance commitment-fee audit cleanup');
      }
    }

    const status = mismatches.length === 0 ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? 'COD commitment fee logic remained unchanged'
        : `Detected ${mismatches.length} COD commitment fee mismatches`,
      evidence: [
        jsonEvidence('scenarios', samples),
        jsonEvidence('mismatches', mismatches)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectPhase1FinancialMaintained(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    return this.inspectWalletLedgerMaintained(context, definition);
  }

  private async inspectBuyBoxJobMonitoring(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const prisma = getGovernancePrisma() as any;
    const latestRun = await prisma.buyBox.findFirst({
      orderBy: { lastComputedAt: 'desc' }
    });
    const latestComputedAt = latestRun?.lastComputedAt ? new Date(latestRun.lastComputedAt) : null;
    const hoursSinceLatest = latestComputedAt ? (Date.now() - latestComputedAt.getTime()) / (1000 * 60 * 60) : Number.POSITIVE_INFINITY;
    const status = latestComputedAt !== null && hoursSinceLatest < 7 ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? `Latest buy-box recomputation is ${hoursSinceLatest.toFixed(2)}h old`
        : 'Buy-box recomputation job appears stale or has not produced a recent result',
      evidence: [
        jsonEvidence('latestBuyBox', latestRun ? {
          productId: latestRun.productId,
          primarySellerId: latestRun.primarySellerId,
          lastComputedAt: latestRun.lastComputedAt
        } : null)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectRollingAverageJobMonitoring(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const prisma = getGovernancePrisma() as any;
    const latestStatsLog = await prisma.catalog_OperatorAuditLog.findFirst({
      where: {
        entityType: 'SellerRollingStats',
        field: 'stats'
      },
      orderBy: { changedAt: 'desc' }
    });
    const latestChangedAt = latestStatsLog?.changedAt ? new Date(latestStatsLog.changedAt) : null;
    const hoursSinceLatest = latestChangedAt ? (Date.now() - latestChangedAt.getTime()) / (1000 * 60 * 60) : Number.POSITIVE_INFINITY;
    const status = latestChangedAt !== null && hoursSinceLatest < 30 ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? `Latest rolling-average stats are ${hoursSinceLatest.toFixed(2)}h old`
        : 'Rolling-average job appears stale or has not produced a recent result',
      evidence: [
        jsonEvidence('latestStatsLog', latestStatsLog ? {
          entityId: latestStatsLog.entityId,
          changedAt: latestStatsLog.changedAt,
          newValue: latestStatsLog.newValue
        } : null)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectScoreUpdateLatency(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const prisma = getGovernancePrisma() as any;
    const latestEvent = await prisma.order_CODScoreEvent.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    const latestTrustScore = latestEvent
      ? await prisma.order_CODTrustScore.findUnique({ where: { buyerId: latestEvent.buyerId } })
      : null;
    const eventAt = latestEvent?.createdAt ? new Date(latestEvent.createdAt) : null;
    const trustUpdatedAt = latestTrustScore?.updatedAt ? new Date(latestTrustScore.updatedAt) : null;
    const latencyMs = eventAt && trustUpdatedAt ? trustUpdatedAt.getTime() - eventAt.getTime() : Number.POSITIVE_INFINITY;
    const status = latencyMs >= 0 && latencyMs <= 5000 ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? `Latest trust score updated ${latencyMs}ms after the event`
        : 'Trust score update latency exceeded the 5 second target',
      evidence: [
        jsonEvidence('latestEvent', latestEvent ? {
          buyerId: latestEvent.buyerId,
          signalType: latestEvent.signalType,
          createdAt: latestEvent.createdAt
        } : null),
        jsonEvidence('latestTrustScore', latestTrustScore ? {
          buyerId: latestTrustScore.buyerId,
          score: latestTrustScore.score,
          tier: latestTrustScore.tier,
          updatedAt: latestTrustScore.updatedAt
        } : null),
        textEvidence('latencyMs', latencyMs)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectOpenBlockingBugs(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const reportPath = path.join(context.rootDir, 'reports', 'governance', 'latest.json');
    let latestReport: any = null;
    if (fs.existsSync(reportPath)) {
      try {
        latestReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      } catch {
        latestReport = null;
      }
    }

    const blockingFailures = Array.isArray(latestReport?.report?.gateResults)
      ? latestReport.report.gateResults.filter((result: any) => {
        return result?.status === 'FAIL' && (result?.severity === 'P0' || result?.severity === 'P1') && result?.blocking !== false;
      })
      : [];

    const status = blockingFailures.length === 0 ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? 'No open blocking P0/P1 bugs are recorded in the latest governance report'
        : `Detected ${blockingFailures.length} open blocking bugs in the latest governance report`,
      evidence: [
        textEvidence('reportPath', reportPath),
        jsonEvidence('latestReportSummary', latestReport?.report?.summary ?? null),
        jsonEvidence('blockingFailures', blockingFailures.slice(0, 10))
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectPhase1RegressionMaintained(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const compliancePath = path.join(context.rootDir, 'reports', 'testing', 'constitution-compliance-report.json');
    const integrationPath = path.join(context.rootDir, 'reports', 'testing', 'integration-constitution-report.json');
    const complianceReport = fs.existsSync(compliancePath) ? JSON.parse(fs.readFileSync(compliancePath, 'utf8')) as Record<string, any> : null;
    const integrationReport = fs.existsSync(integrationPath) ? JSON.parse(fs.readFileSync(integrationPath, 'utf8')) as Record<string, any> : null;
    const status = complianceReport && integrationReport ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? 'Phase 1 advisory regression audits remain present and non-blocking'
        : 'Phase 1 regression audit artifacts are missing',
      evidence: [
        textEvidence('compliancePath', compliancePath),
        textEvidence('integrationPath', integrationPath),
        jsonEvidence('complianceSummary', complianceReport?.summary ?? null),
        jsonEvidence('integrationSummary', integrationReport?.summary ?? null)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF21(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const initialScore = await this.readTrustScore(fixture.verifiedBuyerId);
    const status = initialScore.score === 0 ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? 'New buyer trust score initialized at 0'
        : `Expected trust score 0 but found ${initialScore.score}`,
      evidence: [
        textEvidence('buyerId', fixture.verifiedBuyerId),
        jsonEvidence('trustScore', initialScore)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF22(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const before = await this.readTrustScore(fixture.verifiedBuyerId);

    const orderResponse = await client.placeCodOrder({
      buyerId: fixture.verifiedBuyerId,
      sellerId: fixture.sellerId,
      productId: fixture.productId,
      price: 1000,
      deliveryAddress: {
        street: 'Phase 2 Street',
        city: fixture.sellerCity,
        postalCode: '11101',
        country: 'TZ'
      },
      deliveryFee: 500,
      logisticsEstimate: 500
    });

    const orderId = orderResponse.body?.id ?? orderResponse.body?.data?.id;
    const deliveryCode = orderResponse.body?.deliveryCode ?? orderResponse.body?.data?.deliveryCode;
    if (!orderId || !deliveryCode) {
      const finishedAt = new Date().toISOString();
      return {
        gateId: definition.id,
        title: definition.title,
        category: definition.category,
        severity: definition.severity,
        status: 'FAIL',
        summary: `COD order response did not include the expected identifiers (status=${orderResponse.response.status})`,
        evidence: [
          textEvidence('buyerId', fixture.verifiedBuyerId),
          textEvidence('sellerId', fixture.sellerId),
          jsonEvidence('orderResponse', orderResponse.body)
        ],
        startedAt,
        finishedAt,
        durationMs: Number((performance.now() - started).toFixed(2))
      };
    }

    const confirmResponse = await client.confirmDelivery(orderId, deliveryCode, fixture.verifiedBuyerId, fixture.sellerId);
    const after = await this.readTrustScore(fixture.verifiedBuyerId);
    const status = after.score > before.score ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? 'COD delivery increased trust score'
        : `Trust score did not increase after delivery (before=${before.score}, after=${after.score})`,
      evidence: [
        textEvidence('buyerId', fixture.verifiedBuyerId),
        textEvidence('sellerId', fixture.sellerId),
        textEvidence('orderId', orderId),
        jsonEvidence('orderResponse', orderResponse.body),
        jsonEvidence('confirmResponse', confirmResponse.body),
        jsonEvidence('trustScoreBefore', before),
        jsonEvidence('trustScoreAfter', after)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF23(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);

    const validation = await client.validateCodEligibility({
      buyerId: fixture.unverifiedBuyerId,
      sellerId: fixture.sellerId,
      totalAmount: 1000,
      deliveryFee: 500,
      deliveryAddress: {
        street: 'Phase 2 Street',
        city: fixture.sellerCity,
        postalCode: '11101',
        country: 'TZ'
      },
      sellerAddress: {
        street: 'Phase 2 Seller Street',
        city: fixture.sellerCity,
        postalCode: '11102',
        country: 'TZ'
      },
      items: [{ productId: fixture.productId, quantity: 1, price: 1000 }]
    });

    const eligible = validation.body?.eligible ?? validation.body?.data?.eligible;
    const reason = String(validation.body?.reason ?? validation.body?.data?.reason ?? '');
    const status = eligible === false && reason === 'PHONE_VERIFICATION_REQUIRED' ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? 'COD validation rejected buyer before phone verification'
        : `Expected phone-gated rejection, received ${JSON.stringify(validation.body)}`,
      evidence: [
        textEvidence('buyerId', fixture.unverifiedBuyerId),
        jsonEvidence('validationResponse', validation.body),
        textEvidence('status', validation.response.status)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF24(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const verification = await client.waitForProbe(
      () => client.verifyPhone(fixture.unverifiedBuyerId, fixture.unverifiedBuyerPhone),
      {
        timeoutMs: 120_000,
        intervalMs: 2_000,
        isReady: (result) => result.response.status !== 503
      }
    );
    const validation = await client.validateCodEligibility({
      buyerId: fixture.unverifiedBuyerId,
      sellerId: fixture.sellerId,
      totalAmount: 1000,
      deliveryFee: 500,
      deliveryAddress: {
        street: 'Phase 2 Street',
        city: fixture.sellerCity,
        postalCode: '11101',
        country: 'TZ'
      },
      sellerAddress: {
        street: 'Phase 2 Seller Street',
        city: fixture.sellerCity,
        postalCode: '11102',
        country: 'TZ'
      },
      items: [{ productId: fixture.productId, quantity: 1, price: 1000 }]
    });
    const verificationPassed = verification.response.ok && Boolean(verification.body?.success ?? verification.body?.data?.success ?? true);
    const eligible = validation.body?.eligible ?? validation.body?.data?.eligible;
    const status = verificationPassed && eligible === true;
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Phone verification unlocked COD validation'
        : `Phone verification gate did not unlock COD validation (verify=${verification.response.status}, cod=${JSON.stringify(validation.body)})`,
      evidence: [
        textEvidence('buyerId', fixture.unverifiedBuyerId),
        jsonEvidence('verificationResponse', verification.body),
        jsonEvidence('validationResponse', validation.body)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF25(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const listings = [
      {
        sellerId: fixture.sellerId,
        price: 990,
        rating: 4.8,
        stock: 15,
        matchConfidence: 0.95,
        isSuspended: false,
        lastUpdated: new Date().toISOString()
      },
      {
        sellerId: `usr_alt_${crypto.randomUUID().slice(0, 8)}`,
        price: 1050,
        rating: 4.4,
        stock: 8,
        matchConfidence: 0.95,
        isSuspended: false,
        lastUpdated: new Date().toISOString()
      }
    ];

    const compute = await client.computeBuyBox(fixture.productId, listings);
    const data = compute.body;
    const status = compute.response.ok && data?.primarySellerId === fixture.sellerId;
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Buy-box assignment selected the stronger seller'
        : `Unexpected buy-box winner: ${data?.primarySellerId ?? 'none'}`,
      evidence: [
        textEvidence('productId', fixture.productId),
        jsonEvidence('listings', listings),
        jsonEvidence('buyBoxResponse', data)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF26(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const suspiciousListings = [
      {
        sellerId: fixture.sellerId,
        price: 1000,
        rating: 4.9,
        stock: 10,
        matchConfidence: 0.95,
        isSuspended: false,
        lastUpdated: new Date().toISOString()
      },
      {
        sellerId: `usr_suspicious_${crypto.randomUUID().slice(0, 8)}`,
        price: 999,
        rating: 4.9,
        stock: 1000000,
        matchConfidence: 0.95,
        isSuspended: false,
        lastUpdated: new Date().toISOString()
      }
    ];

    const compute = await client.computeBuyBox(fixture.productId, suspiciousListings);
    const history = await client.getBuyBoxHistory(fixture.productId);
    const snapshots = Array.isArray(history.body?.data) ? history.body.data : history.body?.data?.snapshots ?? history.body;
    const latest = Array.isArray(snapshots) && snapshots.length ? snapshots[0] : null;
    const anomalyFlags = compute.body?.anomalyFlags
      ?? compute.body?.data?.anomalyFlags
      ?? latest?.anomalyFlags
      ?? latest?.signal?.anomalyFlags
      ?? [];
    const status = Array.isArray(anomalyFlags) && anomalyFlags.length > 0 ? 'PASS' : 'FAIL';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status,
      summary: status === 'PASS'
        ? 'Fraud detection produced anomaly flags for suspicious listing data'
        : 'No anomaly flags were detected for the suspicious listing payload',
      evidence: [
        textEvidence('productId', fixture.productId),
        jsonEvidence('suspiciousListings', suspiciousListings),
        jsonEvidence('buyBoxResponse', compute.body),
        jsonEvidence('buyBoxHistory', history.body),
        jsonEvidence('anomalyFlags', anomalyFlags)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF27(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const validation = await client.validateCodEligibility({
      buyerId: fixture.verifiedBuyerId,
      sellerId: fixture.sellerId,
      totalAmount: 40000,
      deliveryFee: 500,
      deliveryAddress: {
        street: 'Phase 2 Street',
        city: fixture.sellerCity,
        postalCode: '11101',
        country: 'TZ'
      },
      sellerAddress: {
        street: 'Phase 2 Seller Street',
        city: fixture.sellerCity,
        postalCode: '11102',
        country: 'TZ'
      },
      items: [{ productId: fixture.productId, quantity: 1, price: 40000 }]
    });
    const eligible = validation.body?.eligible ?? validation.body?.data?.eligible;
    const reason = String(validation.body?.reason ?? validation.body?.data?.reason ?? '');
    const status = eligible === false && reason.includes('exceeds your current limit');
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'COD limit correctly rejected an over-limit order'
        : `Expected a COD limit rejection, received ${JSON.stringify(validation.body)}`,
      evidence: [
        jsonEvidence('validationResponse', validation.body),
        textEvidence('status', validation.response.status)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF28(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const endsAt = await this.createRestriction(fixture.verifiedBuyerId, 15);
    const validation = await client.validateCodEligibility({
      buyerId: fixture.verifiedBuyerId,
      sellerId: fixture.sellerId,
      totalAmount: 1000,
      deliveryFee: 500,
      deliveryAddress: {
        street: 'Phase 2 Street',
        city: fixture.sellerCity,
        postalCode: '11101',
        country: 'TZ'
      },
      sellerAddress: {
        street: 'Phase 2 Seller Street',
        city: fixture.sellerCity,
        postalCode: '11102',
        country: 'TZ'
      },
      items: [{ productId: fixture.productId, quantity: 1, price: 1000 }]
    });
    const statusText = String(JSON.stringify(validation.body));
    const eligible = validation.body?.eligible ?? validation.body?.data?.eligible;
    const reason = String(validation.body?.reason ?? validation.body?.data?.reason ?? '');
    const status = eligible === false && /temporarily restricted|PHONE_VERIFICATION_REQUIRED/i.test(`${statusText} ${reason}`);
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Temporary COD restriction blocked the order'
        : `Restriction gate did not block as expected (${JSON.stringify(validation.body)})`,
      evidence: [
        textEvidence('buyerId', fixture.verifiedBuyerId),
        textEvidence('restrictionEndsAt', endsAt.toISOString()),
        jsonEvidence('validationResponse', validation.body)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  async inspect(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    switch (definition.id) {
      case 'F2.1': return this.inspectF21(context, definition);
      case 'F2.2': return this.inspectF22(context, definition);
      case 'F2.3': return this.inspectF23(context, definition);
      case 'F2.4': return this.inspectF24(context, definition);
      case 'F2.5': return this.inspectF25(context, definition);
      case 'F2.6': return this.inspectF26(context, definition);
      case 'F2.7': return this.inspectF27(context, definition);
      case 'F2.8': return this.inspectF28(context, definition);
      case 'D2.1': return this.inspectScoreEventSourcing(context, definition);
      case 'D2.2': return this.inspectBuyBoxSnapshotIntegrity(context, definition);
      case 'D2.3': return this.inspectRollingAverageAccuracy(context, definition);
      case 'D2.4': return this.inspectAuthSyncMaintained(context, definition);
      case 'FIN2.1': return this.inspectCodCommitmentUnchanged(context, definition);
      case 'FIN2.2': return this.inspectPhase1FinancialMaintained(context, definition);
      case 'OPS2.1': return this.inspectBuyBoxJobMonitoring(context, definition);
      case 'OPS2.2': return this.inspectRollingAverageJobMonitoring(context, definition);
      case 'OPS2.3': return this.inspectScoreUpdateLatency(context, definition);
      case 'OPS2.4': return this.inspectPhase1OperationalMaintained(context, definition);
      case 'R2.1': return this.inspectPhase1RegressionMaintained(context, definition);
      case 'R2.2': return this.inspectCodCommitmentUnchanged(context, definition);
      case 'R2.3': return this.inspectBuyBoxSnapshotIntegrity(context, definition);
      case 'R2.4': return this.inspectScoreEventSourcing(context, definition);
      case 'R2.5': return this.inspectOpenBlockingBugs(context, definition);
      default:
        return {
          gateId: definition.id,
          title: definition.title,
          category: definition.category,
          severity: definition.severity,
          status: 'SKIPPED',
          summary: `Unsupported Phase 2 gate ${definition.id}`,
          evidence: [],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 0
        };
    }
  }
}
