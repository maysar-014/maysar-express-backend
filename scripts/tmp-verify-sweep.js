/**
 * Live endpoint verification sweep (verification-first evidence generator).
 * Calls every openapi.yaml operation against the running dev server:
 *  - once anonymously (records whether auth is required)
 *  - once with a role token chosen by path heuristics (GET falls back to admin on 401/403)
 * Writes per-module evidence JSON to docs/FLOWS/_verification/raw/<module>.json
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client } = require('pg');

const BASE = 'http://localhost:3000';
const RAW_DIR = 'docs/FLOWS/_verification/raw';

const USERS = {
  buyer: 'usr_01KRFXQZC36NK3CDEWJJS21RP8',
  seller: 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z',
  supplier: 'usr_01KRFZ1E73P67T886TR2QDY0VT',
  courier: 'usr_01KRFZ1E7W4JDR9N9PMGYDD77S',
  enabler: 'usr_01KRFZ1E8HMAE7MMH175PJ9337',
  admin: 'usr_01M0K33BM4CZFKWZK5AK71GTEV'
};
const EMAILS = {
  buyer: 'buyer@maysar.co.tz',
  seller: 'seller@maysar.co.tz',
  supplier: 'supplier@maysar.co.tz',
  courier: 'courier@maysar.co.tz',
  enabler: 'enabler@maysar.co.tz',
  admin: 'admin@maysar.co.tz'
};
const PASSWORD = 'Maysar@2024!';

function login(email, password) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ email, password });
    const req = http.request(
      `${BASE}/api/auth/login`,
      { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }, timeout: 15000 },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            resolve({ status: res.statusCode, token: j.accessToken || null });
          } catch (e) {
            resolve({ status: res.statusCode, token: null });
          }
        });
      }
    );
    req.on('error', () => resolve({ status: 0, token: null }));
    req.write(body);
    req.end();
  });
}

function request(method, url, token, bodyObj) {
  return new Promise((resolve) => {
    const body = bodyObj ? JSON.stringify(bodyObj) : null;
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    if (body) headers['content-length'] = Buffer.byteLength(body);
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const req = http.request(url, { method, headers, timeout: 12000 }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; if (data.length > 900) res.destroy(); });
      res.on('end', () => finish({ status: res.statusCode, body: data.slice(0, 700) }));
      res.on('close', () => finish({ status: res.statusCode, body: data.slice(0, 700) }));
    });
    req.on('timeout', () => { req.destroy(); finish({ status: 0, body: 'TIMEOUT' }); });
    req.on('error', (e) => finish({ status: 0, body: 'NETERR:' + e.message }));
    if (body) req.write(body);
    req.end();
  });
}

const FIXTURE_QUERIES = [
  ['product', 'SELECT id FROM catalog_products LIMIT 1'],
  ['order', 'SELECT id FROM orders LIMIT 1'],
  ['cart', 'SELECT id FROM "Checkout_Cart" LIMIT 1'],
  ['checkoutSession', 'SELECT id FROM "Checkout_CheckoutSession" LIMIT 1'],
  ['wallet', 'SELECT id FROM wallets LIMIT 1'],
  ['transaction', 'SELECT id FROM wallet_transactions LIMIT 1'],
  ['shipment', 'SELECT id FROM logistics_shipments LIMIT 1'],
  ['delivery', 'SELECT id FROM logistics_deliveries LIMIT 1'],
  ['ticket', 'SELECT id FROM support_tickets LIMIT 1'],
  ['ticketMessage', 'SELECT id FROM support_ticket_messages LIMIT 1'],
  ['agent', 'SELECT id FROM support_agents LIMIT 1'],
  ['request', 'SELECT id FROM request_requests LIMIT 1'],
  ['quote', 'SELECT id FROM request_quotes LIMIT 1'],
  ['module', 'SELECT id FROM "Training_TrainingModule" LIMIT 1'],
  ['post', 'SELECT id FROM community_posts LIMIT 1'],
  ['conversation', 'SELECT id FROM chat_conversations LIMIT 1'],
  ['chatMessage', 'SELECT id FROM chat_messages LIMIT 1'],
  ['business', 'SELECT id FROM businessregistry_businesses LIMIT 1'],
  ['campaign', 'SELECT id FROM campaigns LIMIT 1'],
  ['payout', 'SELECT id FROM payout_payouts LIMIT 1'],
  ['commission', 'SELECT id FROM commission_commissions LIMIT 1'],
  ['referral', 'SELECT id FROM commission_referrals LIMIT 1'],
  ['notification', 'SELECT id FROM notification_notifications LIMIT 1'],
  ['address', 'SELECT id FROM user_addresses LIMIT 1'],
  ['category', 'SELECT id FROM catalog_categories LIMIT 1'],
  ['buyBox', 'SELECT id FROM catalog_buy_boxes LIMIT 1'],
  ['enablerProfile', 'SELECT id FROM enabler_profiles LIMIT 1'],
  ['session', 'SELECT id FROM auth_sessions LIMIT 1'],
  ['roleRequest', 'SELECT id FROM auth_role_requests LIMIT 1'],
  ['inventoryItem', 'SELECT id FROM inventory_stock_items LIMIT 1'],
  ['warehouse', 'SELECT id FROM inventory_warehouses LIMIT 1'],
  ['hold', 'SELECT id FROM wallet_holds LIMIT 1'],
  ['payment', 'SELECT id FROM payments LIMIT 1'],
  ['refund', 'SELECT id FROM payment_refunds LIMIT 1'],
  ['sms', 'SELECT id FROM sms_messages LIMIT 1'],
  ['template', 'SELECT id FROM notification_templates LIMIT 1'],
  ['courier', 'SELECT id FROM logistics_couriers LIMIT 1'],
  ['vehicle', 'SELECT id FROM logistics_vehicles LIMIT 1'],
  ['masterOrder', 'SELECT id FROM order_master_orders LIMIT 1'],
  ['deliveryGroup', 'SELECT id FROM logistics_delivery_groups LIMIT 1'],
  ['pool', 'SELECT id FROM logistics_shipment_pool LIMIT 1'],
  ['sagaLog', 'SELECT id FROM saga_logs LIMIT 1'],
  ['deadLetter', 'SELECT id FROM saga_dead_letters LIMIT 1'],
  ['outbox', 'SELECT id FROM shared_outbox_events LIMIT 1'],
  ['count', 'SELECT id FROM inventory_counts LIMIT 1'],
  ['movement', 'SELECT id FROM inventory_movements LIMIT 1'],
  ['discussion', 'SELECT id FROM community_discussion_threads LIMIT 1'],
  ['article', 'SELECT id FROM community_knowledge_articles LIMIT 1'],
  ['comment', 'SELECT id FROM community_comments LIMIT 1'],
  ['challenge', 'SELECT id FROM community_business_challenges LIMIT 1'],
  ['procurement', 'SELECT id FROM request_procurements LIMIT 1'],
  ['assessment', 'SELECT id FROM request_assessments LIMIT 1']
];

async function loadFixtures() {
  const client = new Client({ connectionString: 'postgresql://maysar_user:M%40ys4r2026%21Db@localhost:5433/maysar_dev' });
  await client.connect();
  const fixtures = { ...USERS };
  for (const [name, q] of FIXTURE_QUERIES) {
    try {
      const r = await client.query(q);
      fixtures[name] = r.rows.length ? r.rows[0].id : 'no-fixture';
    } catch (e) {
      fixtures[name] = 'fixture-error';
    }
  }
  await client.end();
  return fixtures;
}


function pickRole(p) {
  const l = p.toLowerCase();
  if (/admin|\/system|audit|kpi|fraud/.test(l)) return 'admin';
  if (/courier|driver|vehicle/.test(l)) return 'courier';
  if (/enabler/.test(l)) return 'enabler';
  if (/seller/.test(l)) return 'seller';
  if (/supplier|production/.test(l)) return 'supplier';
  return 'buyer';
}

function substitute(p, fixtures) {
  return p.replace(/\{([^}]+)\}/g, (_, raw) => {
    const lower = raw.replace(/[_\-]/g, '').toLowerCase();
    let key = null;
    if (/^masterorder/.test(lower)) key = 'masterOrder';
    else if (/deliverygroup/.test(lower)) key = 'deliveryGroup';
    else if (/buybox/.test(lower)) key = 'buyBox';
    else if (/rolerequest/.test(lower)) key = 'roleRequest';
    else if (/product/.test(lower)) key = 'product';
    else if (/order/.test(lower)) key = 'order';
    else if (/cart/.test(lower)) key = 'cart';
    else if (/checkoutsession/.test(lower)) key = 'checkoutSession';
    else if (/session/.test(lower)) key = 'session';
    else if (/wallet/.test(lower)) key = 'wallet';
    else if (/transaction/.test(lower)) key = 'transaction';
    else if (/shipment|dispatch/.test(lower)) key = 'shipment';
    else if (/delivery/.test(lower)) key = 'delivery';
    else if (/ticketmessage/.test(lower)) key = 'ticketMessage';
    else if (/ticket/.test(lower)) key = 'ticket';
    else if (/agent/.test(lower)) key = 'agent';
    else if (/assessment/.test(lower)) key = 'assessment';
    else if (/procurement/.test(lower)) key = 'procurement';
    else if (/quote/.test(lower)) key = 'quote';
    else if (/^request/.test(lower)) key = 'request';
    else if (/module/.test(lower)) key = 'module';
    else if (/conversation/.test(lower)) key = 'conversation';
    else if (/chatmessage/.test(lower)) key = 'chatMessage';
    else if (/post/.test(lower)) key = 'post';
    else if (/comment/.test(lower)) key = 'comment';
    else if (/article/.test(lower)) key = 'article';
    else if (/thread/.test(lower)) key = 'discussion';
    else if (/challenge|solution/.test(lower)) key = 'challenge';
    else if (/business/.test(lower)) key = 'business';
    else if (/campaign/.test(lower)) key = 'campaign';
    else if (/payout/.test(lower)) key = 'payout';
    else if (/referral/.test(lower)) key = 'referral';
    else if (/commission/.test(lower)) key = 'commission';
    else if (/notification/.test(lower)) key = 'notification';
    else if (/template/.test(lower)) key = 'template';
    else if (/address/.test(lower)) key = 'address';
    else if (/category/.test(lower)) key = 'category';
    else if (/warehouse/.test(lower)) key = 'warehouse';
    else if (/inventory|stockitem/.test(lower)) key = 'inventoryItem';
    else if (/movement/.test(lower)) key = 'movement';
    else if (/hold/.test(lower)) key = 'hold';
    else if (/refund/.test(lower)) key = 'refund';
    else if (/payment/.test(lower)) key = 'payment';
    else if (/sms/.test(lower)) key = 'sms';
    else if (/deadletter/.test(lower)) key = 'deadLetter';
    else if (/saga/.test(lower)) key = 'sagaLog';
    else if (/outbox/.test(lower)) key = 'outbox';
    else if (/vehicle|tariff/.test(lower)) key = 'vehicle';
    else if (/enabler/.test(lower)) key = 'enablerProfile';
    else if (/pool/.test(lower)) key = 'pool';
    else if (/sellerid/.test(lower)) key = 'seller';
    else if (/buyerid|userid|clientid|customerid/.test(lower)) key = 'buyer';
    else if (/supplierid/.test(lower)) key = 'supplier';
    else if (/courierid/.test(lower)) key = 'courier';
    else if (/enablerid/.test(lower)) key = 'enabler';
    else if (/adminid/.test(lower)) key = 'admin';
    else if (/messageid/.test(lower)) key = 'ticketMessage';
    else if (/count/.test(lower)) key = 'count';
    if (!key) {
      if (/code/.test(lower)) return 'ENABLER123';
      if (/slug/.test(lower)) return 'test-slug';
      if (/sku/.test(lower)) return 'SKU-TEST-1';
      if (/tag/.test(lower)) return 'electronics';
      if (/query|search|^q$|email|phone|keyword/.test(lower)) return 'test';
      if (/id$|ids$/.test(lower)) return fixtures.buyer;
      return 'test-000';
    }
    return fixtures[key] !== undefined ? fixtures[key] : 'test-000';
  });
}


async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const endpoints = JSON.parse(fs.readFileSync('docs/_openapi-endpoints.json', 'utf8'));
  const fixtures = await loadFixtures();
  fixtures.code = 'ENABLER123';
  fixtures.slug = 'test-slug';
  fixtures.sku = 'SKU-TEST-1';
  fixtures.tag = 'electronics';

  const tokens = {};
  for (const role of Object.keys(USERS)) {
    const r = await login(EMAILS[role], PASSWORD);
    tokens[role] = r.token;
    console.log(`login ${role}: status=${r.status} token=${r.token ? 'OK' : 'MISSING'}`);
  }

  const results = [];
  let idx = 0;
  const CONC = 4;
  async function worker() {
    while (idx < endpoints.length) {
      const e = endpoints[idx++];
      const url = BASE + substitute(e.path, fixtures);
      const role = pickRole(e.path);
      const isWrite = e.method !== 'GET';
      const anon = await request(e.method, url, null, isWrite ? {} : null);
      let authed = { status: 0, body: 'SKIPPED' };
      if (tokens[role]) {
        authed = await request(e.method, url, tokens[role], isWrite ? {} : null);
      }
      let finalRole = role;
      if (!isWrite && (authed.status === 401 || authed.status === 403) && tokens.admin && role !== 'admin') {
        authed = await request('GET', url, tokens.admin, null);
        finalRole = role + '+admin';
      }
      const modKey = e.path.split('/').filter(Boolean).slice(0, 3).join('/') || 'root';
      results.push({
        module: modKey,
        path: e.path,
        method: e.method,
        tags: e.tags,
        anonStatus: anon.status,
        anonBody: anon.body.slice(0, 250),
        role: finalRole,
        authStatus: authed.status,
        authBody: authed.body.slice(0, 700)
      });
      if (results.length % 50 === 0) console.log(`progress: ${results.length}/${endpoints.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, () => worker()));

  const perModule = {};
  for (const r of results) {
    (perModule[r.module] = perModule[r.module] || []).push(r);
  }
  for (const [k, arr] of Object.entries(perModule)) {
    fs.writeFileSync(path.join(RAW_DIR, `${k.replace(/\//g, '_')}.json`), JSON.stringify(arr, null, 1));
  }
  const summary = {};
  for (const r of results) {
    const k = `${r.method} ${r.anonStatus}->${r.authStatus}`;
    summary[k] = (summary[k] || 0) + 1;
  }
  fs.writeFileSync(
    'docs/FLOWS/_verification/sweep-summary.json',
    JSON.stringify({ total: results.length, statusPairs: summary, fixtures, generatedAt: new Date().toISOString() }, null, 1)
  );
  console.log('DONE total=' + results.length);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });

