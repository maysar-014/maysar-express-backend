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

type Phase4Fixture = {
  sellerId: string;
  sellerPhone: string;
  supplierId: string;
  supplierPhone: string;
  enablerId: string;
  enablerPhone: string;
  kycUserId: string;
  kycPhone: string;
  categoryId: string;
  productId: string;
  sellerSupplierConversationId: string;
};

function jsonEvidence(label: string, value: unknown): EvidenceArtifact {
  return { label, type: 'json', value: JSON.stringify(value, null, 2) };
}

function textEvidence(label: string, value: unknown): EvidenceArtifact {
  return { label, type: 'text', value: typeof value === 'string' ? value : String(value) };
}

function extractData<T = any>(body: any): T {
  if (!body) return body;
  if (body.data !== undefined) return body.data;
  return body;
}

function extractId(body: any): string | undefined {
  const candidate = extractData<any>(body);
  return candidate?.id
    || candidate?.enablerId
    || candidate?.conversationId
    || body?.id
    || body?.enablerId
    || body?.conversationId;
}

export class Phase4LiveInspector implements GovernanceInspector {
  private fixturePromise: Promise<Phase4Fixture> | null = null;

  constructor(public readonly gateId: string) {}

  private client(context: GovernanceExecutionContext): LiveGovernanceClient {
    return new LiveGovernanceClient(context.targetBaseUrl);
  }

  private async ensureFixture(context: GovernanceExecutionContext): Promise<Phase4Fixture> {
    if (!this.fixturePromise) {
      this.fixturePromise = this.bootstrapFixture(context);
    }
    return this.fixturePromise;
  }

  private async bootstrapFixture(context: GovernanceExecutionContext): Promise<Phase4Fixture> {
    const client = this.client(context);
    const prisma = getGovernancePrisma() as any;
    const userRepository = new PrismaUserRepository(prisma, new PiiEncryptionService());
    const unique = createUniqueTag('phase4');
    const sellerPhone = `+2556${String(91110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const supplierPhone = `+2556${String(101110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const enablerPhone = `+2557${String(111110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;
    const kycPhone = `+2557${String(121110000 + Math.floor(Math.random() * 8888888)).slice(0, 8)}`;

    const sellerEmail = `${unique}.seller@example.com`;
    const supplierEmail = `${unique}.supplier@example.com`;
    const enablerEmail = `${unique}.enabler@example.com`;
    const kycEmail = `${unique}.kyc@example.com`;

    const seedUser = async (id: string, email: string, phone: string, role: 'buyer' | 'seller' | 'supplier' | 'enabler') => {
      const user = User.create({
        id,
        publicCode: `MYS-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`,
        email: Email.create(email),
        phoneNumber: new PhoneNumber(phone),
        firstName: 'Phase',
        lastName: role.charAt(0).toUpperCase() + role.slice(1),
        role,
        preferredLanguage: 'sw',
        preferredCurrency: 'TZS',
        addresses: [],
        codEnabled: true
      });
      await userRepository.create(user as any);
    };

    const sellerId = `usr_${createUlid()}`;
    const supplierId = `usr_${createUlid()}`;
    const enablerId = `usr_${createUlid()}`;
    const kycUserId = `usr_${createUlid()}`;

    await Promise.all([
      seedUser(sellerId, sellerEmail, sellerPhone, 'seller'),
      seedUser(supplierId, supplierEmail, supplierPhone, 'supplier'),
      seedUser(enablerId, enablerEmail, enablerPhone, 'enabler'),
      seedUser(kycUserId, kycEmail, kycPhone, 'buyer')
    ]);

    await Promise.all([
      prisma.user_User.update({ where: { id: sellerId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date(), kycStatus: 'VERIFIED', kycLevel: 1, kycVerifiedAt: new Date() } }),
      prisma.user_User.update({ where: { id: supplierId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date() } }),
      prisma.user_User.update({ where: { id: enablerId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date() } }),
      prisma.user_User.update({ where: { id: kycUserId }, data: { isPhoneVerified: true, phoneVerifiedAt: new Date() } })
    ]);

    const categoryId = `cat_phase4_${unique.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18)}`;
    await prisma.category.create({
      data: {
        id: categoryId,
        parentId: null,
        name: `Governance ${unique}`,
        slug: `governance-${unique}`,
        description: 'Governance phase 4 category',
        imageUrl: null,
        displayOrder: 9999,
        isActive: true,
        seoMetadata: null
      }
    });

    const productId = `prd_phase4_${unique.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18)}`;
    await prisma.product.create({
      data: {
        id: productId,
        sellerId,
        title: `Phase 4 Product ${unique}`,
        description: 'Governance phase 4 product',
        supplierLocationId: null,
        supplierLocation: 'Dar es Salaam',
        categoryId,
        brand: 'Governance',
        model: 'Phase4Fixture',
        status: 'published',
        visibility: 'public',
        seoMetadata: null,
        tags: ['governance-fixture'],
        gtin: null,
        mpn: null,
        isbn: null,
        fingerprint: `${unique}-fingerprint`,
        fingerprintVersion: 1,
        slug: `phase-4-product-${unique}`,
        seoTitle: `Phase 4 Product ${unique}`,
        shortSeoDescription: 'Governance phase 4 product',
        generatedDescription: 'Governance phase 4 product',
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
        name: `Phase 4 Product ${unique}`,
        price: String(25000),
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
        altText: `Phase 4 Product ${unique}`,
        displayOrder: 0,
        isPrimary: true,
        metadata: { source: 'governance-fixture' },
        uploadedBy: sellerId
      }
    });

    const sellerSupplierConversation = await client.initiateConversation({
      userId: sellerId,
      type: 'SELLER_SUPPLIER',
      recipientId: supplierId,
      initiatorRole: 'SELLER',
      recipientRole: 'SUPPLIER',
      relatedProductId: productId,
      relatedOrderId: null
    });
    const sellerSupplierConversationId = extractId(sellerSupplierConversation);
    if (!sellerSupplierConversationId) {
      throw new Error('Unable to bootstrap Phase 4 conversation');
    }

    return {
      sellerId,
      sellerPhone,
      supplierId,
      supplierPhone,
      enablerId,
      enablerPhone,
      kycUserId,
      kycPhone,
      categoryId,
      productId,
      sellerSupplierConversationId
    };
  }

  private async inspectF42(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const registration = await client.registerEnabler(fixture.enablerId, {
      businessName: `Governance Enabler ${fixture.enablerId}`,
      contactEmail: `${fixture.enablerId}@example.com`,
      contactPhone: fixture.enablerPhone,
      businessDescription: 'Governance fixture enabler',
      taxId: '123456789',
      yearsInBusiness: 2,
      hasBusinessLicense: true,
      salesExperience: 2
    });
    const enablerId = extractId(registration);
    const approval = enablerId
      ? await client.approveEnabler(enablerId, 'usr_phase4_admin_0001', ['identity-verified', 'business-verified'])
      : null;
    const prisma = getGovernancePrisma() as any;
    const analytics = await prisma.enabler_Analytics.findUnique({
      where: { enablerId: enablerId ?? fixture.enablerId }
    });
    const status = registration.response.status === 201
      && approval?.response?.status === 200
      && Boolean(analytics);
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Enabler onboarding created the profile, analytics, and approval state'
        : `Enabler onboarding failed (register=${registration.response.status}, approve=${approval?.response?.status ?? 'n/a'})`,
      evidence: [
        jsonEvidence('registration', registration.body),
        jsonEvidence('approval', approval?.body),
        jsonEvidence('analytics', analytics)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF43(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const conversation = await client.initiateConversation({
      userId: fixture.sellerId,
      type: 'SELLER_SUPPLIER',
      recipientId: fixture.supplierId,
      initiatorRole: 'SELLER',
      recipientRole: 'SUPPLIER',
      relatedProductId: fixture.productId
    });
    const conversationId = extractId(conversation);
    if (!conversationId) {
      throw new Error('Seller-supplier conversation did not return an ID');
    }
    const sent = await client.sendChatMessage(conversationId, fixture.sellerId, {
      type: 'TEXT',
      content: 'Governance restock request.'
    });
    const list = await client.listConversationMessages(conversationId, fixture.sellerId);
    const messages = Array.isArray(list.body?.data?.messages)
      ? list.body.data.messages
      : Array.isArray(list.body?.data)
        ? list.body.data
        : [];
    const status = conversation.response.status === 201 && sent.response.status === 201 && messages.length >= 1;
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Seller-supplier conversation and message exchange completed'
        : `Seller-supplier chat failed (conversation=${conversation.response.status}, message=${sent.response.status})`,
      evidence: [
        textEvidence('conversationId', conversationId),
        jsonEvidence('conversation', conversation.body),
        jsonEvidence('message', sent.body),
        jsonEvidence('messages', messages)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectF45(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const documents = ['id-front.jpg', 'id-back.jpg', 'proof-of-address.pdf'];
    const submit = await client.submitKyc(fixture.kycUserId, {
      fullName: 'Governance KYC User',
      nationalId: '123456789012345',
      businessName: 'Governance KYC Business',
      documents
    });
    const approve = await client.approveKyc(fixture.kycUserId, 2);
    const prisma = getGovernancePrisma() as any;
    const user = await prisma.user_User.findUnique({
      where: { id: fixture.kycUserId },
      select: { kycStatus: true, kycLevel: true, kycData: true, kycSubmittedAt: true, kycVerifiedAt: true }
    });
    const auditLogs = await prisma.kyc_AuditLog.findMany({
      where: { userId: fixture.kycUserId },
      orderBy: { createdAt: 'asc' }
    });
    const status = submit.response.status === 200
      && approve.response.status === 200
      && String(user?.kycStatus ?? '').toUpperCase() === 'VERIFIED'
      && Number(user?.kycLevel ?? 0) >= 2
      && auditLogs.length >= 2;
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'KYC submission and verification updated the user record and audit trail'
        : `KYC verification failed (submit=${submit.response.status}, approve=${approve.response.status})`,
      evidence: [
        jsonEvidence('submission', submit.body),
        jsonEvidence('approval', approve.body),
        jsonEvidence('user', user),
        jsonEvidence('auditLogs', auditLogs)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectOps41(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const client = this.client(context);
    const submit = await client.submitKyc(fixture.kycUserId, {
      fullName: 'Governance KYC Docs',
      nationalId: '123456789012345',
      businessName: 'Governance KYC Business',
      documents: ['id-front.jpg', 'id-back.jpg']
    });
    const prisma = getGovernancePrisma() as any;
    const user = await prisma.user_User.findUnique({
      where: { id: fixture.kycUserId },
      select: { kycData: true }
    });
    const storedDocuments = Array.isArray((user?.kycData as any)?.documents) ? (user?.kycData as any).documents : [];
    const status = submit.response.status === 200 && storedDocuments.length >= 2;
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'KYC documents were stored in the user record'
        : `KYC document storage failed (status=${submit.response.status})`,
      evidence: [
        jsonEvidence('submission', submit.body),
        jsonEvidence('storedKycData', user?.kycData),
        jsonEvidence('storedDocuments', storedDocuments)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectOps42(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const prisma = getGovernancePrisma() as any;
    const auditLogs = await prisma.kyc_AuditLog.findMany({
      where: { userId: fixture.kycUserId },
      orderBy: { createdAt: 'asc' }
    });
    const status = auditLogs.length >= 1 && auditLogs.some((log: any) => /kyc/i.test(String(log.action)));
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'Compliance audit log captured the KYC actions'
        : 'No compliance audit log entries were found for the KYC workflow',
      evidence: [
        jsonEvidence('auditLogs', auditLogs)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  private async inspectD42(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fixture = await this.ensureFixture(context);
    const prisma = getGovernancePrisma() as any;
    const user = await prisma.user_User.findUnique({
      where: { id: fixture.kycUserId },
      select: { kycStatus: true, kycLevel: true, kycData: true, kycSubmittedAt: true, kycVerifiedAt: true, kycNationalId: true }
    });
    const auditLogs = await prisma.kyc_AuditLog.findMany({
      where: { userId: fixture.kycUserId },
      orderBy: { createdAt: 'asc' }
    });
    const status = String(user?.kycStatus ?? '').toUpperCase() === 'PENDING'
      || String(user?.kycStatus ?? '').toUpperCase() === 'VERIFIED'
      && auditLogs.length >= 1;
    const finishedAt = new Date().toISOString();
    return {
      gateId: definition.id,
      title: definition.title,
      category: definition.category,
      severity: definition.severity,
      status: status ? 'PASS' : 'FAIL',
      summary: status
        ? 'KYC user record and audit log stayed internally consistent'
        : 'KYC data integrity check failed',
      evidence: [
        jsonEvidence('user', user),
        jsonEvidence('auditLogs', auditLogs)
      ],
      startedAt,
      finishedAt,
      durationMs: Number((performance.now() - started).toFixed(2))
    };
  }

  async inspect(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    switch (definition.id) {
      case 'F4.2': return this.inspectF42(context, definition);
      case 'F4.3': return this.inspectF43(context, definition);
      case 'F4.5': return this.inspectF45(context, definition);
      case 'OPS4.1': return this.inspectOps41(context, definition);
      case 'OPS4.2': return this.inspectOps42(context, definition);
      case 'D4.2': return this.inspectD42(context, definition);
      case 'F4.1':
      case 'F4.4':
      case 'F4.6':
      case 'D4.1':
      case 'D4.3':
      case 'D4.4':
      case 'FIN4.1':
      case 'FIN4.2':
      case 'OPS4.3':
      case 'R4.1':
      case 'R4.2':
      case 'R4.3':
        return {
          gateId: definition.id,
          title: definition.title,
          category: definition.category,
          severity: definition.severity,
          status: 'SKIPPED',
          summary: `Live inspector not yet implemented for ${definition.id}`,
          evidence: [textEvidence('note', 'Phase 4 gate not yet wired to live inspector logic')],
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
          summary: `Unsupported Phase 4 gate ${definition.id}`,
          evidence: [],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 0
        };
    }
  }
}
