/**
 * RequestAccessLink Entity (Phase 1 §1.5)
 *
 * A secure, unguessable assessment link. Only the SHA-256 hash of the raw
 * token is persisted; the raw token is shown exactly once. Single-use:
 * ACTIVE → USED | EXPIRED | REVOKED.
 */

import { createHash, randomBytes } from 'crypto';
import { makeId } from '../../../../../shared/ids/id';

export type AccessLinkStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

export interface RequestAccessLinkData {
  id: string;
  requestId: string;
  quoteId: string;
  customerId: string;
  tokenHash: string;
  status: AccessLinkStatus;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export function makeAccessLinkId(): string {
  return makeId('RAL');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 32 random bytes, base64url-encoded (§1.5). */
export function generateRawToken(): string {
  return randomBytes(32).toString('base64url');
}

export class RequestAccessLink {
  private data: RequestAccessLinkData;

  constructor(data: RequestAccessLinkData) {
    if (!data.requestId) throw new Error('RequestAccessLink invariant violation: requestId is required');
    if (!data.quoteId) throw new Error('RequestAccessLink invariant violation: quoteId is required');
    if (!data.customerId) throw new Error('RequestAccessLink invariant violation: customerId is required');
    if (!data.tokenHash || data.tokenHash.length !== 64) {
      throw new Error('RequestAccessLink invariant violation: tokenHash must be a SHA-256 hex digest');
    }
    if (!['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'].includes(data.status)) {
      throw new Error(`RequestAccessLink invariant violation: unknown status ${data.status}`);
    }
    if (data.status === 'USED' && !data.usedAt) throw new Error('RequestAccessLink invariant violation: USED requires usedAt');
    this.data = { ...data };
  }

  static create(params: {
    requestId: string;
    quoteId: string;
    customerId: string;
    expiresAt: Date;
    rawToken: string;
  }): RequestAccessLink {
    const now = new Date();
    if (params.expiresAt <= now) {
      throw new Error('RequestAccessLink invariant violation: expiresAt must be in the future');
    }
    return new RequestAccessLink({
      id: makeAccessLinkId(),
      requestId: params.requestId,
      quoteId: params.quoteId,
      customerId: params.customerId,
      tokenHash: hashToken(params.rawToken),
      status: 'ACTIVE',
      expiresAt: params.expiresAt,
      usedAt: null,
      createdAt: now,
    });
  }

  markUsed(): void {
    if (this.data.status !== 'ACTIVE') {
      throw new Error(`RequestAccessLink invariant violation: only ACTIVE links can be used (current: ${this.data.status})`);
    }
    if (this.data.expiresAt < new Date()) {
      throw new Error('RequestAccessLink invariant violation: cannot use an expired link');
    }
    this.data = { ...this.data, status: 'USED', usedAt: new Date() };
  }

  markExpired(): void { this.data = { ...this.data, status: 'EXPIRED' }; }
  revoke(): void { this.data = { ...this.data, status: 'REVOKED' }; }

  /** True when still usable (ACTIVE + not expired). */
  get isUsable(): boolean {
    return this.data.status === 'ACTIVE' && this.data.expiresAt >= new Date();
  }

  // ── Read-only accessors ────────────────────────────────────────────────────
  get id() { return this.data.id; }
  get requestId() { return this.data.requestId; }
  get quoteId() { return this.data.quoteId; }
  get customerId() { return this.data.customerId; }
  get tokenHash() { return this.data.tokenHash; }
  get status() { return this.data.status; }
  get expiresAt() { return this.data.expiresAt; }
  get usedAt() { return this.data.usedAt; }
  get createdAt() { return this.data.createdAt; }

  toJSON(): RequestAccessLinkData {
    return { ...this.data };
  }
}