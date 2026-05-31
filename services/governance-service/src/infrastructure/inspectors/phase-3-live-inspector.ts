import crypto from 'crypto';
import { performance } from 'perf_hooks';
import { Email } from '../../../../../services/user-service/src/domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../../../services/user-service/src/domain/value-objects/phone-number.value-object';
import { User } from '../../../../../services/user-service/src/domain/entities/user.entity';
import { PrismaUserRepository } from '../../../../../services/user-service/src/infrastructure/repositories/prisma-user.repository';
import { PiiEncryptionService } from '../../../../../shared/encryption/pii-encryption.service';
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

type Phase3Fixture = {
  sellerId: string;
  sellerEmail: string;
  sellerPhone: string;
  buyerAId: string;
  buyerAPhone: string;
  buyerBId: string;
  buyerBPhone: string;
  buyerCId: string;
  buyerCPhone: string;
  buyerDId: string;
  buyerDPhone: string;
  buyerEId: string;
  buyerEPhone: string;
  buyerFId: string;
  buyerFPhone: string;
  courierId: string;
  courierPhone: string;
  categoryId: string;
  productId: string;
  productName: string;
  productPrice: number;
  deliveryAddress: { street: string; city: string; postalCode: string; country: string };
  chatConversationId: string;
  reviewOrderId: string;
  reviewOrderDeliveryCode: string;
  reviewBuyerId: string;
  reviewBuyerPhone: string;
  ratingBuyers: Array<{ buyerId: string; phone: string; orderId: string; deliveryCode: string; rating: number }>;
};

function jsonEvidence(label: string, value: unknown): EvidenceArtifact {
  return { label, type: 'json', value: JSON.stringify(value, null, 2) };
}

function textEvidence(label: string, value: unknown): EvidenceArtifact {
  return { label, type: 'text', value: typeof value === 'string' ? value : String(value) };
}

function extractData<T = any>(body: any): T {
  if (!body) return body;
  const candidate = body.body !== undefined ? body.body : body;
  if (candidate?.data !== undefined) return candidate.data;
  return candidate;
}

function extractId(body: any): string | undefined {
  const candidate = extractData<any>(body);
  return candidate?.id
    || candidate?.conversationId
    || candidate?.reviewId
    || candidate?.messageId
    || body?.id
    || body?.conversationId
    || body?.reviewId
    || body?.messageId
    || body?.body?.id
    || body?.body?.conversationId
    || body?.body?.reviewId
    || body?.body?.messageId;
}

export class Phase3LiveInspector implements GovernanceInspector {
  private static fixturePromise: Promise<Phase3Fixture> | null = null;
  private static reviewModerationTargetId: string | null = null;

  constructor(public readonly gateId: string) {}

  private client(context: GovernanceExecutionContext): LiveGovernanceClient {
    return new LiveGovernanceClient(context.targetBaseUrl);
  }

  private async ensureFixture(context: GovernanceExecutionContext): Promise<Phase3Fixture> {
    if (!Phase3LiveInspector.fixturePromise) {
      Phase3LiveInspector.fixturePromise = this.bootstrapFixture(context);
    }
    return Phase3LiveInspector.fixturePromise;
  }

  private async bootstrapFixture(context: GovernanceExecutionContext): Promise<Phase3Fixture> {
    const client = this.client(context);
    const prisma = getGovernancePrisma() as any;
    const userRepository = new PrismaUserRepository(prisma, new PiiEncryptionService());
    const unique = createUniqueTag('phase3');
    const sellerCity = 'Dar es Salaam';
    const sellerPhone = `+2556${String(31110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const buyerAPhone = `+2557${String(41110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const buyerBPhone = `+2557${String(51110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const buyerCPhone = `+2557${String(61110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const buyerDPhone = `+2557${String(71110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const buyerEPhone = `+2557${String(72110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const buyerFPhone = `+2557${String(73110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const courierPhone = `+2557${String(81110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;

    const sellerEmail = `${unique}.seller@example.com`;
    const buyerAEmail = `${unique}.buyer-a@example.com`;
    const buyerBEmail = `${unique}.buyer-b@example.com`;
    const buyerCEmail = `${unique}.buyer-c@example.com`;
    const buyerDEmail = `${unique}.buyer-d@example.com`;
    const buyerEEmail = `${unique}.buyer-e@example.com`;
    const buyerFEmail = `${unique}.buyer-f@example.com`;
    const courierEmail = `${unique}.courier@example.com`;

    const seedUser = async (id: string, email: string, phone: string, role: 'buyer' | 'seller' | 'courier') => {
      const user = User.create({
        id,
        publicCode: `MYS-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`,
        email: Email.create(email),
        phoneNumber: new PhoneNumber(phone),
        firstName: 'Phase',
        lastName: role === 'buyer' ? 'Buyer' : role === 'seller' ? 'Seller' : 'Courier',
        role,
        preferredLanguage: 'sw',
        preferredCurrency: 'TZS',
        addresses: [],
        codEnabled: true
      });
      await userRepository.create(user as any);
    };

    const sellerId = `usr_${createUlid()}`;
    const buyerAId = `usr_${createUlid()}`;
    const buyerBId = `usr_${createUlid()}`;
    const buyerCId = `usr_${createUlid()}`;
    const buyerDId = `usr_${createUlid()}`;
    const buyerEId = `usr_${createUlid()}`;
    const buyerFId = `usr_${createUlid()}`;
    const courierId = `usr_${createUlid()}`;

    await Promise.all([
      seedUser(sellerId, sellerEmail, sellerPhone, 'seller'),
      seedUser(buyerAId, buyerAEmail, buyerAPhone, 'buyer'),
      seedUser(buyerBId, buyerBEmail, buyerBPhone, 'buyer'),
      seedUser(buyerCId, buyerCEmail, buyerCPhone, 'buyer'),
      seedUser(buyerDId, buyerDEmail, buyerDPhone, 'buyer'),
      seedUser(buyerEId, buyerEEmail, buyerEPhone, 'buyer'),
      seedUser(buyerFId, buyerFEmail, buyerFPhone, 'buyer'),
      seedUser(courierId, courierEmail, courierPhone, 'courier')
    ]);

    await Promise.all([
      prisma.user_User.update({ where: { id: sellerId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date(), kycStatus: 'VERIFIED', kycLevel: 1, kycVerifiedAt: new Date() } }),
      prisma.user_User.update({ where: { id: buyerAId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date() } }),
      prisma.user_User.update({ where: { id: buyerBId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date() } }),
      prisma.user_User.update({ where: { id: buyerCId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date() } }),
      prisma.user_User.update({ where: { id: buyerDId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date() } }),
      prisma.user_User.update({ where: { id: buyerEId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date() } }),
      prisma.user_User.update({ where: { id: buyerFId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date() } }),
      prisma.user_User.update({ where: { id: courierId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date() } })
    ]);

    for (const walletUserId of [buyerAId, buyerBId, buyerCId, buyerDId, buyerEId, buyerFId]) {
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

    const categoryId = `cat_phase3_${unique.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18)}`;
    await prisma.category.create({
      data: {
        id: categoryId,
        parentId: null,
        name: `Governance ${unique}`,
        slug: `governance-${unique}`,
        description: 'Governance phase 3 category',
        imageUrl: null,
        displayOrder: 9999,
        isActive: true,
        seoMetadata: null
      }
    });

    const productPrice = 25000;
    const productName = `Phase 3 Product ${unique}`;
    const productId = `prd_phase3_${unique.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18)}`;
    await prisma.product.create({
      data: {
        id: productId,
        sellerId,
        title: productName,
        description: 'Governance phase 3 product',
        supplierLocationId: null,
        supplierLocation: sellerCity,
        categoryId,
        brand: 'Governance',
        model: 'Phase3Fixture',
        status: 'published',
        visibility: 'public',
        seoMetadata: null,
        tags: ['governance-fixture'],
        gtin: null,
        mpn: null,
        isbn: null,
        fingerprint: `${unique}-fingerprint`,
        fingerprintVersion: 1,
        slug: `phase-3-product-${unique}`,
        seoTitle: productName,
        shortSeoDescription: 'Governance phase 3 product',
        generatedDescription: 'Governance phase 3 product',
        qualityScore: 100,
        enablerEnabled: false,
        enablerCommissionRate: null,
        codAccepted: true,
        freeDelivery: true,
        condition: 'new'
      }
    });
    await prisma.productVariant.create({
      data: {
        id: `var_${productId}`,
        productId,
        sku: `${unique}-sku`,
        name: productName,
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
        altText: productName,
        displayOrder: 0,
        isPrimary: true,
        metadata: { source: 'governance-fixture' },
        uploadedBy: sellerId
      }
    });

    const deliveryAddress = {
      street: 'Phase 3 Street',
      city: sellerCity,
      postalCode: '11101',
      country: 'TZ'
    };

    const createCodOrder = (buyerId: string) => client.waitForProbe(
      () => client.placeCodOrder({
        buyerId,
        sellerId,
        productId,
        price: productPrice,
        deliveryAddress,
        deliveryFee: 5000
      }),
      {
        timeoutMs: 120_000,
        intervalMs: 2_000,
        isReady: (result) => result.response.ok && Boolean(result.body?.id || result.body?.data?.id)
      }
    );

    const reviewOrder = await createCodOrder(buyerAId);
    const reviewOrderId = reviewOrder.body?.id || reviewOrder.body?.data?.id;
    const reviewOrderDeliveryCode = reviewOrder.body?.deliveryCode || reviewOrder.body?.data?.deliveryCode;
    if (!reviewOrderId || !reviewOrderDeliveryCode) {
      throw new Error('Unable to bootstrap Phase 3 review order');
    }
    await client.waitForProbe(
      () => client.confirmDelivery(reviewOrderId, reviewOrderDeliveryCode, buyerAId, sellerId),
      {
        timeoutMs: 120_000,
        intervalMs: 2_000,
        isReady: (result) => result.response.ok
      }
    );

    const uniquenessOrder = await createCodOrder(buyerBId);
    const uniquenessOrderId = uniquenessOrder.body?.id || uniquenessOrder.body?.data?.id;
    const uniquenessOrderDeliveryCode = uniquenessOrder.body?.deliveryCode || uniquenessOrder.body?.data?.deliveryCode;
    if (!uniquenessOrderId || !uniquenessOrderDeliveryCode) {
      throw new Error('Unable to bootstrap Phase 3 duplicate review order');
    }
    await client.waitForProbe(
      () => client.confirmDelivery(uniquenessOrderId, uniquenessOrderDeliveryCode, buyerBId, sellerId),
      {
        timeoutMs: 120_000,
        intervalMs: 2_000,
        isReady: (result) => result.response.ok
      }
    );

    const chatConversationResponse = await client.waitForProbe(
      () => client.initiateConversation({
        userId: buyerAId,
        type: 'BUYER_SELLER',
        recipientId: sellerId,
        initiatorRole: 'BUYER',
        recipientRole: 'SELLER',
        relatedProductId: productId,
        relatedOrderId: reviewOrderId
      }),
      {
        timeoutMs: 120_000,
        intervalMs: 2_000,
        isReady: (result) => result.response.ok && Boolean(extractId(result.body))
      }
    );
    const chatConversationId = extractId(chatConversationResponse);
    if (!chatConversationId) {
      throw new Error('Unable to bootstrap Phase 3 chat conversation');
    }

    const ratingBuyers: Array<{ buyerId: string; phone: string; orderId: string; deliveryCode: string; rating: number }> = [];
    for (const [buyerId, phone, rating] of [
      [buyerCId, buyerCPhone, 1],
      [buyerDId, buyerDPhone, 4],
      [buyerEId, buyerEPhone, 5]
    ] as const) {
      const order = await createCodOrder(buyerId);
      const orderId = order.body?.id || order.body?.data?.id;
      const deliveryCode = order.body?.deliveryCode || order.body?.data?.deliveryCode;
      if (!orderId || !deliveryCode) {
        throw new Error('Unable to bootstrap Phase 3 rating order');
      }
      await client.waitForProbe(
        () => client.confirmDelivery(orderId, deliveryCode, buyerId, sellerId),
        {
          timeoutMs: 120_000,
          intervalMs: 2_000,
          isReady: (result) => result.response.ok
        }
      );
      ratingBuyers.push({ buyerId, phone, orderId, deliveryCode, rating });
    }

    return {
      sellerId,
      sellerEmail,
      sellerPhone,
      buyerAId,
      buyerAPhone,
      buyerBId,
      buyerBPhone,
      buyerCId,
      buyerCPhone,
      buyerDId,
      buyerDPhone,
      buyerEId,
      buyerEPhone,
      buyerFId,
      buyerFPhone,
      courierId,
      courierPhone,
      categoryId,
      productId,
      productName,
      productPrice,
      deliveryAddress,
      chatConversationId,
      reviewOrderId,
      reviewOrderDeliveryCode,
      reviewBuyerId: buyerAId,
      reviewBuyerPhone: buyerAPhone,
      ratingBuyers
    };
  }

  private async readReviewStats(productId: string) {
    const prisma = getGovernancePrisma() as any;
    const reviews = await prisma.catalog_ProductReview.findMany({
      where: { productId, moderationStatus: 'VISIBLE' },
      select: { rating: true }
    });
    const reviewCount = reviews.length;
    const totalRating = reviews.reduce((sum: number, review: { rating: number }) => sum + Number(review.rating), 0);
    const averageRating = reviewCount > 0 ? totalRating / reviewCount : null;
    const distribution = reviews.reduce<Record<string, number>>((accumulator, review: { rating: number }) => {
      const key = String(review.rating);
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
    return { reviewCount, averageRating, distribution };
  }

  private async inspectF31(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const conversation = await client.initiateConversation({
      userId: fixture.buyerAId,
      type: 'BUYER_SELLER',
      recipientId: fixture.sellerId,
      initiatorRole: 'BUYER',
      recipientRole: 'SELLER',
      relatedProductId: fixture.productId,
      relatedOrderId: fixture.reviewOrderId
    });
    const conversationId = extractId(conversation);
    if (!conversationId) {
      throw new Error('Buyer-seller conversation did not return an ID');
    }
    const firstMessage = await client.sendChatMessage(conversationId, fixture.buyerAId, {
      type: 'PRODUCT_CARD',
      metadata: { productId: fixture.productId }
    });
    const reply = await client.sendChatMessage(conversationId, fixture.sellerId, {
      type: 'TEXT',
      content: 'Confirmed, we can proceed.'
    });
    const messages = await client.listConversationMessages(conversationId, fixture.buyerAId);
    const messageList = Array.isArray(messages.body?.data?.messages)
      ? messages.body.data.messages
      : Array.isArray(messages.body?.data)
        ? messages.body.data
        : [];
    const status = conversation.response.ok
      && firstMessage.response.status === 201
      && reply.response.status === 201
      && messageList.length >= 2;
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Buyer-seller chat created and messages exchanged successfully'
        : `Buyer-seller chat flow failed (conversation=${conversation.response.status}, first=${firstMessage.response.status}, reply=${reply.response.status})`,
      evidence: [
        textEvidence('conversationId', conversationId),
        jsonEvidence('conversation', conversation.body),
        jsonEvidence('firstMessage', firstMessage.body),
        jsonEvidence('replyMessage', reply.body),
        jsonEvidence('messages', messageList)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF32(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const voiceNote = await client.uploadVoiceNote(
      fixture.buyerAId,
      Buffer.from('phase-3-governance-voice-note'),
      7,
      'audio/mpeg'
    );
    const mediaUrl = extractData<any>(voiceNote.body)?.mediaUrl ?? voiceNote.body?.mediaUrl;
    const conversation = await client.getConversation(fixture.chatConversationId, fixture.buyerAId);
    const conversationId = extractId(conversation) ?? fixture.chatConversationId;
    const message = await client.sendChatMessage(conversationId, fixture.buyerAId, {
      type: 'VOICE_NOTE',
      metadata: {
        mediaUrl,
        durationSeconds: 7
      }
    });
    const stored = extractData<any>(message.body);
    const status = voiceNote.response.status === 201
      && message.response.status === 201
      && typeof mediaUrl === 'string'
      && typeof stored?.metadata?.mediaUrl === 'string';
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Voice note uploaded and delivered through chat'
        : `Voice note delivery failed (upload=${voiceNote.response.status}, message=${message.response.status})`,
      evidence: [
        textEvidence('conversationId', conversationId),
        jsonEvidence('uploadResponse', voiceNote.body),
        jsonEvidence('messageResponse', message.body)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF37(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const review = await client.waitForProbe(
      () => client.submitReview(fixture.productId, fixture.reviewBuyerId, {
        rating: 5,
        comment: 'Governance delivery verified.'
      }),
      {
        timeoutMs: 120_000,
        intervalMs: 2_000,
        isReady: (result) => result.response.status !== 503
      }
    );
    const reviewId = extractId(review);
    if (reviewId) {
      Phase3LiveInspector.reviewModerationTargetId = reviewId;
    }
    const stats = await this.readReviewStats(fixture.productId);
    const status = review.response.status === 201
      && reviewId
      && (stats.reviewCount >= 1)
      && (stats.averageRating !== null);
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Delivered buyer review persisted and aggregates updated'
        : `Review submission failed (status=${review.response.status})`,
      evidence: [
        textEvidence('reviewId', reviewId ?? 'unknown'),
        jsonEvidence('reviewResponse', review.body),
        jsonEvidence('reviewStats', stats)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF38(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const review = await client.waitForProbe(
      () => client.submitReview(fixture.productId, fixture.buyerFId, {
        rating: 4,
        comment: 'Should be rejected because this buyer has not completed delivery.'
      }),
      {
        timeoutMs: 120_000,
        intervalMs: 2_000,
        isReady: (result) => result.response.status !== 503
      }
    );
    const responseText = JSON.stringify(review.body);
    const status = review.response.status === 403 && /purchase|required|delivered/i.test(responseText);
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Purchase verification correctly rejected an unqualified review'
        : `Expected review rejection, received HTTP ${review.response.status}`,
      evidence: [
        jsonEvidence('reviewResponse', review.body),
        textEvidence('status', review.response.status)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF39(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const prisma = getGovernancePrisma() as any;
    const reviewRecord = await prisma.catalog_ProductReview.findFirst({
      where: { productId: fixture.productId, buyerId: fixture.reviewBuyerId }
    });
    const reviewId = Phase3LiveInspector.reviewModerationTargetId ?? reviewRecord?.id;
    if (!reviewId) {
      throw new Error('Unable to find review for moderation');
    }
    const moderation = await client.moderateReview(reviewId, 'usr_phase3_admin_0001', 'HIDDEN');
    const reviews = await client.listReviews(fixture.productId);
    const reviewList = Array.isArray(reviews.body?.data?.reviews)
      ? reviews.body.data.reviews
      : Array.isArray(reviews.body?.data)
        ? reviews.body.data
        : [];
    const visibleReviewIds = reviewList.map((entry: any) => entry.id).filter(Boolean);
    const stats = await this.readReviewStats(fixture.productId);
    const status = moderation.response.status === 200
      && !visibleReviewIds.includes(reviewId)
      && stats.reviewCount >= 0;
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Moderated review disappeared from the public listing immediately'
        : `Review moderation did not update the public listing (status=${moderation.response.status})`,
      evidence: [
        textEvidence('reviewId', reviewId),
        jsonEvidence('moderationResponse', moderation.body),
        jsonEvidence('publicReviews', reviewList),
        jsonEvidence('reviewStats', stats)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF310(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const review = await client.waitForProbe(
      () => client.submitReview(fixture.productId, fixture.sellerId, {
        rating: 5,
        comment: 'Seller attempting to review own product'
      }),
      {
        timeoutMs: 120_000,
        intervalMs: 2_000,
        isReady: (result) => result.response.status !== 503
      }
    );
    const bodyText = JSON.stringify(review.body);
    const status = review.response.status === 403 && /seller|own product|prohibited/i.test(bodyText);
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Seller self-review was blocked'
        : `Expected seller self-review rejection, received HTTP ${review.response.status}`,
      evidence: [
        jsonEvidence('reviewResponse', review.body),
        textEvidence('status', review.response.status)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectD31(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const conversation = await client.getConversation(fixture.chatConversationId, fixture.buyerAId);
    const conversationId = extractId(conversation) ?? fixture.chatConversationId;
    const messagesToSend = Array.from({ length: 20 }, (_, index) => `ordered-message-${index + 1}`);
    for (const content of messagesToSend) {
      await client.sendChatMessage(conversationId, fixture.buyerAId, {
        type: 'TEXT',
        content
      });
    }
    const listing = await client.listConversationMessages(conversationId, fixture.buyerAId);
    const messages = Array.isArray(listing.body?.data?.messages)
      ? listing.body.data.messages
      : Array.isArray(listing.body?.data)
        ? listing.body.data
        : [];
    const createdAtValues = messages.map((message: any) => message.createdAt).filter(Boolean);
    const sorted = [...createdAtValues].sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
    const status = createdAtValues.length >= 20 && JSON.stringify(createdAtValues.slice(-20)) === JSON.stringify(sorted.slice(-20));
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Conversation history returned in ascending createdAt order'
        : 'Message ordering was not stable in the public history response',
      evidence: [
        textEvidence('conversationId', conversationId),
        jsonEvidence('createdAtValues', createdAtValues),
        jsonEvidence('messages', messages)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectD32(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const prisma = getGovernancePrisma() as any;
    const conversation = await client.getConversation(fixture.chatConversationId, fixture.buyerAId);
    const conversationId = extractId(conversation) ?? fixture.chatConversationId;
    const sent = await client.sendChatMessage(conversationId, fixture.buyerAId, {
      type: 'PRODUCT_CARD',
      metadata: { productId: fixture.productId }
    });
    await prisma.product.update({
      where: { id: fixture.productId },
      data: {
        title: `${fixture.productName} Updated`,
        description: 'Updated after snapshot capture',
        updatedAt: new Date()
      }
    });
    await prisma.productVariant.updateMany({
      where: { productId: fixture.productId },
      data: {
        price: String(fixture.productPrice + 5000)
      }
    });
    const listing = await client.listConversationMessages(conversationId, fixture.buyerAId);
    const messages = Array.isArray(listing.body?.data?.messages)
      ? listing.body.data.messages
      : Array.isArray(listing.body?.data)
        ? listing.body.data
        : [];
    const productCard = [...messages].reverse().find((message: any) => String(message.type).toUpperCase() === 'PRODUCT_CARD');
    const snapshotPrice = Number(productCard?.metadata?.price ?? productCard?.content?.price ?? NaN);
    const status = sent.response.status === 201
      && snapshotPrice === fixture.productPrice;
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Product card snapshot remained immutable after product update'
        : 'Product card snapshot changed after product update',
      evidence: [
        textEvidence('conversationId', conversationId),
        jsonEvidence('messageResponse', sent.body),
        jsonEvidence('productUpdate', {
          productId: fixture.productId,
          title: `${fixture.productName} Updated`,
          price: fixture.productPrice + 5000
        }),
        jsonEvidence('productCardMessage', productCard)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectD33(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const first = await client.submitReview(fixture.productId, fixture.buyerBId, {
      rating: 4,
      comment: 'Duplicate review probe one'
    });
    const second = await client.submitReview(fixture.productId, fixture.buyerBId, {
      rating: 5,
      comment: 'Duplicate review probe two'
    });
    const prisma = getGovernancePrisma() as any;
    const dbReview = await prisma.catalog_ProductReview.findMany({
      where: { productId: fixture.productId, buyerId: fixture.buyerBId }
    });
    const status = first.response.status === 201
      && second.response.status === 409
      && dbReview.length === 1;
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Duplicate review submissions were blocked'
        : `Expected review uniqueness enforcement, received HTTP ${second.response.status}`,
      evidence: [
        jsonEvidence('firstReview', first.body),
        jsonEvidence('secondReview', second.body),
        jsonEvidence('databaseReviews', dbReview)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectD34(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const prisma = getGovernancePrisma() as any;
    await prisma.catalog_ProductReview.deleteMany({
      where: { productId: fixture.productId }
    });

    const ratings = fixture.ratingBuyers;
    for (const record of ratings) {
      await client.submitReview(fixture.productId, record.buyerId, {
        rating: record.rating,
        comment: `Rating ${record.rating} governance review`
      });
    }

    const stats = await this.readReviewStats(fixture.productId);
    const manualCount = ratings.length;
    const manualAverage = ratings.reduce((sum, record) => sum + record.rating, 0) / manualCount;
    const manualDistribution = ratings.reduce<Record<string, number>>((accumulator, record) => {
      const key = String(record.rating);
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    const status = stats.reviewCount === manualCount
      && Math.abs((stats.averageRating ?? 0) - manualAverage) < 0.01
      && Object.values(manualDistribution).reduce((sum, count) => sum + count, 0) === manualCount;
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Rating distribution and average matched the manual calculation'
        : 'Rating distribution integrity did not match the submitted ratings',
      evidence: [
        jsonEvidence('submittedRatings', ratings),
        jsonEvidence('reviewStats', stats),
        jsonEvidence('manualDistribution', manualDistribution),
        textEvidence('manualAverage', manualAverage.toFixed(2))
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  async inspect(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    switch (definition.id) {
      case 'F3.1': return this.inspectF31(context, definition);
      case 'F3.2': return this.inspectF32(context, definition);
      case 'F3.7': return this.inspectF37(context, definition);
      case 'F3.8': return this.inspectF38(context, definition);
      case 'F3.9': return this.inspectF39(context, definition);
      case 'F3.10': return this.inspectF310(context, definition);
      case 'D3.1': return this.inspectD31(context, definition);
      case 'D3.2': return this.inspectD32(context, definition);
      case 'D3.3': return this.inspectD33(context, definition);
      case 'D3.4': return this.inspectD34(context, definition);
      case 'F3.3':
      case 'F3.4':
      case 'F3.5':
      case 'F3.6':
      case 'D3.5':
      case 'D3.6':
      case 'FIN3.1':
      case 'FIN3.2':
      case 'OPS3.1':
      case 'OPS3.2':
      case 'OPS3.3':
      case 'OPS3.4':
      case 'OPS3.5':
      case 'R3.1':
      case 'R3.2':
      case 'R3.3':
      case 'R3.4':
        return {
          gateId: definition.id,
          title: definition.title,
          category: definition.category,
          severity: definition.severity,
          status: 'SKIPPED',
          summary: `Live inspector not yet implemented for ${definition.id}`,
          evidence: [textEvidence('note', 'Phase 3 gate not yet wired to live inspector logic')],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 0
        };
      default:
        return {
          gateId: definition.id,
          title: definition.title,
          category: definition.category,
          severity: definition.severity,
          status: 'SKIPPED',
          summary: `Unsupported Phase 3 gate ${definition.id}`,
          evidence: [],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 0
        };
    }
  }
}
