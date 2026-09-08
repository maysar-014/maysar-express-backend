/**
 * RequestAccessLink — hashing + single-use lifecycle (Phase 1 §1.5 acceptance).
 */

import { RequestAccessLink, generateRawToken, hashToken } from '../request-access-link.entity';

const linkParams = {
  requestId: 'req_1',
  quoteId: 'rqt_1',
  customerId: 'usr_customer',
  rawToken: 'abc',
};

describe('token handling (§B-7)', () => {
  it('raw token is 32 bytes base64url (~43 chars) and unguessable', () => {
    const token = generateRawToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(token).not.toMatch(/[+/=]/); // base64url alphabet
  });

  it('only the SHA-256 hash is stored, never the raw token', () => {
    const raw = generateRawToken();
    const link = RequestAccessLink.create({ ...linkParams, rawToken: raw, expiresAt: new Date(Date.now() + 3600000) });
    expect(link.tokenHash).toBe(hashToken(raw));
    expect(link.tokenHash).toHaveLength(64);
    expect(JSON.stringify(link.toJSON())).not.toContain(raw);
  });

  it('rejects a tokenHash that is not a SHA-256 hex digest', () => {
    expect(
      () =>
        new RequestAccessLink({
          id: 'ral_1',
          requestId: 'req_1',
          quoteId: 'rqt_1',
          customerId: 'c',
          tokenHash: 'not-a-hash',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 3600000),
          usedAt: null,
          createdAt: new Date(),
        }),
    ).toThrow('SHA-256 hex digest');
  });
});

describe('access link lifecycle', () => {
  it('create() starts ACTIVE with future expiry', () => {
    const link = RequestAccessLink.create({ ...linkParams, expiresAt: new Date(Date.now() + 3600000) });
    expect(link.status).toBe('ACTIVE');
    expect(link.isUsable).toBe(true);
  });

  it('rejects an expiry in the past', () => {
    expect(() =>
      RequestAccessLink.create({ ...linkParams, expiresAt: new Date(Date.now() - 1000) }),
    ).toThrow('expiresAt must be in the future');
  });

  it('markUsed() transitions ACTIVE → USED and stamps usedAt', () => {
    const link = RequestAccessLink.create({ ...linkParams, expiresAt: new Date(Date.now() + 3600000) });
    link.markUsed();
    expect(link.status).toBe('USED');
    expect(link.usedAt).not.toBeNull();
  });

  it('a USED link cannot be reused (single-use)', () => {
    const link = RequestAccessLink.create({ ...linkParams, expiresAt: new Date(Date.now() + 3600000) });
    link.markUsed();
    expect(() => link.markUsed()).toThrow('only ACTIVE links can be used');
    expect(link.isUsable).toBe(false);
  });

  it('an expired link is not usable and cannot be used', () => {
    // Sweeper path: constructed directly with a past expiry (create() rejects
    // past expiries by design).
    const link = new RequestAccessLink({
      id: 'ral_expired',
      requestId: 'req_1',
      quoteId: 'rqt_1',
      customerId: 'usr_customer',
      tokenHash: hashToken(generateRawToken()),
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      createdAt: new Date(),
    });
    expect(link.isUsable).toBe(false);
    expect(() => link.markUsed()).toThrow('cannot use an expired link');
  });

  it('revoke() makes the link unusable', () => {
    const link = RequestAccessLink.create({ ...linkParams, expiresAt: new Date(Date.now() + 3600000) });
    link.revoke();
    expect(link.status).toBe('REVOKED');
    expect(link.isUsable).toBe(false);
  });
});