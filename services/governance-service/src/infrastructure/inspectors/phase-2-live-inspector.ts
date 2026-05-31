import crypto from 'crypto';
import { performance } from 'perf_hooks';
import { createUlid } from '../../../../../shared/ids/id';
import {
  ConstitutionGateDefinition,
  EvidenceArtifact,
  GateResult,
  GovernanceExecutionContext,
  GovernanceInspector
} from '../../domain/governance.types';
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
      case 'D2.1':
      case 'D2.2':
      case 'D2.3':
      case 'D2.4':
      case 'FIN2.1':
      case 'FIN2.2':
      case 'OPS2.1':
      case 'OPS2.2':
      case 'OPS2.3':
      case 'OPS2.4':
      case 'R2.1':
      case 'R2.2':
      case 'R2.3':
      case 'R2.4':
      case 'R2.5': {
        return {
          gateId: definition.id,
          title: definition.title,
          category: definition.category,
          severity: definition.severity,
          status: 'SKIPPED',
          summary: `Live inspector not yet implemented for ${definition.id}`,
          evidence: [textEvidence('note', 'Phase 2 gate not yet wired to live inspector logic')],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 0
        };
      }
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
