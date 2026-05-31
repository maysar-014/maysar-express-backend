import crypto from 'crypto';
import { createPrismaClient } from '@shared/database/prisma-client';

const SERVICE_BASES = {
  user: '/api/user',
  order: '/api/order',
  catalog: '/api/catalog',
  kyc: '/api/kyc',
  chat: '/api/chat',
  enabler: '/api/enabler'
} as const;

type ServiceName = keyof typeof SERVICE_BASES;

let prismaClient: ReturnType<typeof createPrismaClient> | null = null;

export function getGovernancePrisma(): ReturnType<typeof createPrismaClient> {
  if (!prismaClient) {
    prismaClient = createPrismaClient();
  }
  return prismaClient;
}

export function createContractHeaders(args: { userId: string; roles: string[]; email?: string }): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-contract-test': '1',
    'x-user-id': args.userId,
    'x-user-roles': args.roles.join(','),
    ...(args.email ? { 'x-user-email': args.email } : {})
  };
}

export function createUniqueTag(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export class LiveGovernanceClient {
  constructor(private readonly baseUrl: string) {}

  async waitForProbe<T>(
    probe: () => Promise<T>,
    options: {
      timeoutMs?: number;
      intervalMs?: number;
      isReady?: (result: T) => boolean;
    } = {}
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? 60_000;
    const intervalMs = options.intervalMs ?? 1_000;
    const isReady = options.isReady ?? ((result: any) => Boolean(result?.response?.ok));
    const started = Date.now();
    let lastResult: T | null = null;
    let lastError: unknown = null;

    while (Date.now() - started < timeoutMs) {
      try {
        const result = await probe();
        lastResult = result;
        if (isReady(result)) {
          return result;
        }
      } catch (error) {
        lastError = error;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `Governance probe did not become ready within ${timeoutMs}ms${lastResult ? `: ${JSON.stringify(lastResult)}` : ''}${lastError ? ` | lastError=${lastError instanceof Error ? lastError.message : String(lastError)}` : ''}`
    );
  }

  async waitForReady(timeoutMs: number = 60_000, intervalMs: number = 1_000) {
    const started = Date.now();
    let lastError: unknown = null;
    const normalizedBase = this.baseUrl.replace(/\/$/, '');

    while (Date.now() - started < timeoutMs) {
      try {
        const [healthResponse, readyResponse] = await Promise.all([
          fetch(`${normalizedBase}/health`),
          fetch(`${normalizedBase}/ready`)
        ]);
        const [healthText, readyText] = await Promise.all([healthResponse.text(), readyResponse.text()]);
        const parseBody = (text: string) => {
          try {
            return text ? JSON.parse(text) : null;
          } catch {
            return text;
          }
        };
        const health = { response: healthResponse, body: parseBody(healthText), url: `${normalizedBase}/health` };
        const ready = { response: readyResponse, body: parseBody(readyText), url: `${normalizedBase}/ready` };

        if (health.response.ok && ready.response.ok) {
          return { health, ready };
        }

        lastError = {
          healthStatus: health.response.status,
          readyStatus: ready.response.status,
          healthBody: health.body,
          readyBody: ready.body
        };
      } catch (error) {
        lastError = error;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Governance target did not become ready within ${timeoutMs}ms${lastError ? `: ${JSON.stringify(lastError)}` : ''}`);
  }

  private buildUrl(service: ServiceName, path: string): string {
    const normalizedBase = this.baseUrl.replace(/\/$/, '');
    const serviceBase = SERVICE_BASES[service];
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${serviceBase}${normalizedPath}`;
  }

  async request(service: ServiceName, path: string, init: RequestInit = {}) {
    const response = await fetch(this.buildUrl(service, path), init);
    const text = await response.text();
    let body: any = text;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    return { response, body, url: this.buildUrl(service, path) };
  }

  async json(service: ServiceName, path: string, method: string, body?: unknown, headers?: Record<string, string>) {
    return this.request(service, path, {
      method,
      headers: {
        ...(method.toUpperCase() === 'POST' && !headers?.['idempotency-key']
          ? { 'idempotency-key': crypto.randomUUID() }
          : {}),
        ...(headers || {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }

  async createUser(input: {
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    role: 'buyer' | 'seller' | 'supplier' | 'courier' | 'enabler' | 'system';
  }) {
    return this.json('user', '/', 'POST', input, createContractHeaders({
      userId: input.email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || createUniqueTag('usr'),
      roles: ['admin'],
      email: input.email
    }));
  }

  async verifyPhone(userId: string, phoneNumber: string, otp: string = '123456') {
    return this.json('user', `/${encodeURIComponent(userId)}/phone/verify`, 'POST', {
      phoneNumber,
      otp,
      verificationMethod: 'otp'
    }, createContractHeaders({ userId, roles: ['buyer'] }));
  }

  async getCodReputation(userId: string) {
    return this.request('user', `/${encodeURIComponent(userId)}/cod-reputation`, {
      method: 'GET',
      headers: createContractHeaders({ userId, roles: ['buyer'] })
    });
  }

  async approveKyc(userId: string, kycLevel: number = 1, adminUserId: string = 'usr_admin_0001') {
    return this.json('kyc', `/admin/${encodeURIComponent(userId)}`, 'PATCH', {
      action: 'approve',
      kycLevel
    }, createContractHeaders({ userId: adminUserId, roles: ['admin'] }));
  }

  async submitKyc(userId: string, body: { fullName: string; nationalId: string; businessName?: string; documents?: string[] }) {
    return this.json('kyc', '/submit', 'POST', body, createContractHeaders({ userId, roles: ['buyer'] }));
  }

  async listCategories(adminUserId: string) {
    return this.request('catalog', '/v1/categories', {
      method: 'GET',
      headers: createContractHeaders({ userId: adminUserId, roles: ['admin'] })
    });
  }

  async createCategory(adminUserId: string, body: Record<string, unknown>) {
    return this.json('catalog', '/v1/categories', 'POST', body, createContractHeaders({ userId: adminUserId, roles: ['admin'] }));
  }

  async createProduct(sellerId: string, body: Record<string, unknown>) {
    return this.json('catalog', '/v1/products', 'POST', body, createContractHeaders({ userId: sellerId, roles: ['seller'] }));
  }

  async updateProduct(sellerId: string, productId: string, body: Record<string, unknown>) {
    return this.json('catalog', `/v1/products/${encodeURIComponent(productId)}`, 'PUT', body, createContractHeaders({ userId: sellerId, roles: ['seller'] }));
  }

  async getProduct(productId: string) {
    return this.request('catalog', `/v1/products/${encodeURIComponent(productId)}`, {
      method: 'GET',
      headers: createContractHeaders({ userId: 'usr_contract_reader', roles: ['buyer'] })
    });
  }

  async computeBuyBox(productId: string, listings: unknown[]) {
    return this.json('catalog', `/products/${encodeURIComponent(productId)}/buy-box/compute`, 'POST', { listings }, createContractHeaders({
      userId: 'usr_contract_operator',
      roles: ['admin']
    }));
  }

  async getBuyBox(productId: string) {
    return this.request('catalog', `/products/${encodeURIComponent(productId)}/buy-box`, {
      method: 'GET',
      headers: createContractHeaders({ userId: 'usr_contract_reader', roles: ['buyer'] })
    });
  }

  async getBuyBoxHistory(productId: string, adminUserId: string = 'usr_contract_operator') {
    return this.request('catalog', `/v1/admin/buy-box/history/${encodeURIComponent(productId)}`, {
      method: 'GET',
      headers: createContractHeaders({ userId: adminUserId, roles: ['admin'] })
    });
  }

  async placeCodOrder(input: {
    buyerId: string;
    sellerId: string;
    productId: string;
    price: number;
    currency?: string;
    deliveryAddress: { street: string; city: string; postalCode: string; country: string };
    deliveryFee?: number;
    logisticsEstimate?: number;
  }) {
    return this.json('order', '/orders', 'POST', {
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      items: [{
        productId: input.productId,
        quantity: 1,
        price: input.price,
        weight: 1
      }],
      currency: input.currency ?? 'TZS',
      paymentMethod: 'COD',
      deliveryFee: input.deliveryFee ?? 0,
      deliveryAddress: input.deliveryAddress
    }, createContractHeaders({ userId: input.buyerId, roles: ['buyer'] }));
  }

  async validateCodEligibility(input: {
    buyerId: string;
    sellerId: string;
    totalAmount: number;
    deliveryFee: number;
    currency?: string;
    deliveryAddress: { street: string; city: string; postalCode: string; country: string };
    sellerAddress: { street: string; city: string; postalCode: string; country: string };
    items: Array<{ productId: string; quantity: number; price: number }>;
  }) {
    return this.json('order', '/orders/cod/validate', 'POST', {
      ...input,
      currency: input.currency ?? 'TZS'
    }, createContractHeaders({ userId: input.buyerId, roles: ['buyer'] }));
  }

  async confirmDelivery(orderId: string, deliveryCode: string, buyerId: string, sellerId: string) {
    return this.json('order', `/orders/${encodeURIComponent(orderId)}/confirm-delivery`, 'POST', {
      deliveryCode
    }, createContractHeaders({ userId: buyerId, roles: ['buyer'] , email: `${buyerId}@example.com` }));
  }

  async getOrder(orderId: string, userId: string) {
    return this.request('order', `/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: createContractHeaders({ userId, roles: ['buyer'] })
    });
  }

  async initiateConversation(input: {
    userId: string;
    type: 'BUYER_SELLER' | 'SELLER_SUPPLIER' | 'BUYER_COURIER' | 'SELLER_TEAM';
    recipientId: string;
    initiatorRole: 'BUYER' | 'SELLER' | 'SUPPLIER' | 'COURIER';
    recipientRole: 'BUYER' | 'SELLER' | 'SUPPLIER' | 'COURIER';
    relatedProductId?: string | null;
    relatedOrderId?: string | null;
  }) {
    return this.json('chat', '/v1/conversations', 'POST', {
      type: input.type,
      recipientId: input.recipientId,
      initiatorRole: input.initiatorRole,
      recipientRole: input.recipientRole,
      relatedProductId: input.relatedProductId ?? null,
      relatedOrderId: input.relatedOrderId ?? null,
      relatedShipmentId: null,
      relatedSupplierRequestId: null
    }, createContractHeaders({ userId: input.userId, roles: [input.initiatorRole.toLowerCase()] }));
  }

  async getConversation(conversationId: string, userId: string) {
    return this.request('chat', `/v1/conversations/${encodeURIComponent(conversationId)}`, {
      method: 'GET',
      headers: createContractHeaders({ userId, roles: ['buyer'] })
    });
  }

  async sendChatMessage(conversationId: string, userId: string, body: Record<string, unknown>) {
    return this.json('chat', `/v1/conversations/${encodeURIComponent(conversationId)}/messages`, 'POST', body, createContractHeaders({
      userId,
      roles: ['buyer']
    }));
  }

  async listConversationMessages(conversationId: string, userId: string) {
    return this.request('chat', `/v1/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'GET',
      headers: createContractHeaders({ userId, roles: ['buyer'] })
    });
  }

  async uploadVoiceNote(userId: string, file: Blob | File | Buffer, durationSeconds: number, mimeType: string = 'audio/mpeg') {
    const formData = new FormData();
    const blob = file instanceof Buffer
      ? new Blob([file], { type: mimeType })
      : file;
    formData.set('mediaType', 'voice_note');
    formData.set('durationSeconds', String(durationSeconds));
    formData.set('file', blob, 'voice-note.mp3');
    const headers = createContractHeaders({ userId, roles: ['buyer'] });
    delete headers['Content-Type'];
    return this.request('chat', '/v1/media/upload', {
      method: 'POST',
      headers,
      body: formData as any
    });
  }

  async submitReview(productId: string, buyerId: string, body: { rating: number; comment?: string }) {
    return this.json('catalog', `/v1/products/${encodeURIComponent(productId)}/reviews`, 'POST', body, createContractHeaders({ userId: buyerId, roles: ['buyer'] }));
  }

  async listReviews(productId: string) {
    return this.request('catalog', `/v1/products/${encodeURIComponent(productId)}/reviews`, {
      method: 'GET',
      headers: createContractHeaders({ userId: 'usr_contract_reader', roles: ['buyer'] })
    });
  }

  async moderateReview(reviewId: string, adminUserId: string, newStatus: 'VISIBLE' | 'FLAGGED' | 'HIDDEN') {
    return this.json('catalog', `/v1/reviews/${encodeURIComponent(reviewId)}/moderate`, 'PUT', { newStatus }, createContractHeaders({ userId: adminUserId, roles: ['admin'] }));
  }

  async registerEnabler(userId: string, body: Record<string, unknown>) {
    return this.json('enabler', '/enablers/register', 'POST', {
      userId,
      ...body
    }, createContractHeaders({ userId, roles: ['enabler'] }));
  }

  async approveEnabler(enablerId: string, adminUserId: string, completenessEvents: string[] = ['identity-verified', 'business-verified']) {
    return this.json('enabler', `/enablers/${encodeURIComponent(enablerId)}/approve`, 'POST', {
      adminId: adminUserId,
      completenessEvents
    }, createContractHeaders({ userId: adminUserId, roles: ['admin'] }));
  }

  async listEnablerProducts(enablerId: string, userId: string) {
    return this.request('enabler', `/enablers/${encodeURIComponent(enablerId)}/listings`, {
      method: 'GET',
      headers: createContractHeaders({ userId, roles: ['enabler'] })
    });
  }

  async createEnablerListing(enablerId: string, userId: string, body: Record<string, unknown>) {
    return this.json('enabler', `/enablers/${encodeURIComponent(enablerId)}/listings`, 'POST', body, createContractHeaders({ userId, roles: ['enabler'] }));
  }
}
