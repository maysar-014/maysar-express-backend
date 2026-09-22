/**
 * Focused probes to resolve specific discrepancies found by the sweep.
 * Writes docs/FLOWS/_verification/raw/probes.json
 */
const fs = require('fs');
const http = require('http');
const BASE = 'http://localhost:3000';

function req(method, url, token, bodyObj) {
  return new Promise((resolve) => {
    const body = bodyObj ? JSON.stringify(bodyObj) : null;
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    if (body) headers['content-length'] = Buffer.byteLength(body);
    let done = false;
    const fin = (r) => { if (!done) { done = true; resolve(r); } };
    const r = http.request(url, { method, headers, timeout: 15000 }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; if (d.length > 1200) res.destroy(); });
      res.on('end', () => fin({ status: res.statusCode, body: d.slice(0, 900) }));
      res.on('close', () => fin({ status: res.statusCode, body: d.slice(0, 900) }));
    });
    r.on('timeout', () => { r.destroy(); fin({ status: 0, body: 'TIMEOUT' }); });
    r.on('error', (e) => fin({ status: 0, body: 'ERR:' + e.message }));
    if (body) r.write(body);
    r.end();
  });
}

function login(email, password) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ email, password });
    const r = http.request(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }, timeout: 15000
    }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d).accessToken || null); } catch (e) { resolve(null); } });
    });
    r.on('error', () => resolve(null));
    r.write(body); r.end();
  });
}

const PROBE_PATH = 'docs/FLOWS/_verification/raw/probes.json';

async function main() {
  const tokens = {
    buyer: await login('buyer@maysar.co.tz', 'Maysar@2024!'),
    admin: await login('admin@maysar.co.tz', 'Maysar@2024!'),
    seller: await login('seller@maysar.co.tz', 'Maysar@2024!'),
    supplier: await login('supplier@maysar.co.tz', 'Maysar@2024!'),
    enabler: await login('enabler@maysar.co.tz', 'Maysar@2024!')
  };

  const out = [];
  const probe = async (label, method, path, role, bodyObj) => {
    const r = await req(method, BASE + path, tokens[role], bodyObj);
    out.push({ label, method, path, role, status: r.status, body: r.body, tokenPresent: !!tokens[role] });
  };

  // D-01 checkout path contract
  await probe('D01-openapi-declared', 'POST', '/api/checkout/items', 'buyer', {});
  await probe('D01-implementation', 'POST', '/api/checkout/cart/items', 'buyer', {});
  await probe('D01-openapi-declared-merge', 'POST', '/api/checkout/merge', 'buyer', {});
  await probe('D01-implementation-merge', 'POST', '/api/checkout/cart/merge', 'buyer', {});
  await probe('D01-cart-current', 'GET', '/api/checkout/cart/current', 'buyer', null);
  await probe('D01-openapi-cartid', 'DELETE', '/api/checkout/chk_cart_01M1M5ZKXJ4GKYB4RDF9YADFKE', 'buyer', null);
  await probe('D01-impl-cartid', 'DELETE', '/api/checkout/cart/chk_cart_01M1M5ZKXJ4GKYB4RDF9YADFKE', 'buyer', null);

  // D-02 payment 500s (real order + bogus id to separate not-found from crash)
  await probe('D02-payment-bogus-id', 'GET', '/api/payment/payments/pay_DOES_NOT_EXIST', 'buyer', null);
  await probe('D02-payment-order', 'GET', '/api/payment/payments/order/MSR-ORD-20260903-204842-402F', 'buyer', null);
  await probe('D02-payment-list', 'GET', '/api/payment/payments', 'buyer', null);
  await probe('D02-payment-status', 'GET', '/api/payment/payments/pay_DOES_NOT_EXIST/status', 'buyer', null);

  // D-03 enabler 500
  await probe('D03-enabler-bogus', 'GET', '/api/enabler/enablers/enr_DOES_NOT_EXIST', 'enabler', null);
  await probe('D03-enabler-list', 'GET', '/api/enabler/enablers', 'enabler', null);
  await probe('D03-enabler-me', 'GET', '/api/enabler/enablers/me', 'enabler', null);

  // D-04 analytics action item resolve
  await probe('D04-actionitem-bogus', 'PATCH', '/api/analytics/action-items/ai_DOES_NOT_EXIST/resolve', 'admin', {});

  // D-05 catalog search redirect chain
  await probe('D05-search-canonical', 'GET', '/api/catalog/v1/products/search?q=test', 'buyer', null);

  // D-06 auth refresh without cookie (expected 401 by design?)
  await probe('D06-refresh-no-cookie', 'POST', '/api/auth/refresh', 'buyer', {});

  // D-07 internal endpoints guard
  await probe('D07-user-lookup', 'GET', '/api/user/lookup?email=buyer@maysar.co.tz', 'admin', null);

  fs.writeFileSync(PROBE_PATH, JSON.stringify(out, null, 1));
}

main().catch((e) => { fs.writeFileSync('logs/probe-err.txt', String(e && e.stack)); });
