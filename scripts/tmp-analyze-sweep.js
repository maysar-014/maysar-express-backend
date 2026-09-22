/**
 * Classify sweep evidence into verification statuses.
 * Verified      : 200/201/204 with role token, or documented 4xx validation on bad input
 * Failing       : 5xx responses
 * Auth-blocked  : 401/403 even after admin fallback
 * Data-missing  : 404 caused by absent fixtures
 * Unverified    : everything else needing manual review
 */
const fs = require('fs');
const path = require('path');

const RAW = 'docs/FLOWS/_verification/raw';
const files = fs.readdirSync(RAW);
const all = [];
for (const f of files) {
  const rows = JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'));
  for (const r of rows) all.push(r);
}

function classify(r) {
  const s = r.authStatus;
  if (s >= 500) return 'FAILING_5XX';
  if (s === 0) return 'UNREACHABLE';
  if (s === 200 || s === 201 || s === 204) {
    if (r.method === 'GET') return 'VERIFIED_READ';
    return 'VERIFIED_WRITE';
  }
  if (s === 400 || s === 422) return 'VERIFIED_VALIDATION';
  if (s === 401) return 'AUTH_BLOCKED';
  if (s === 403) return 'PERMISSION_BOUNDARY';
  if (s === 404) return 'RESOURCE_ABSENT';
  if (s === 405) return 'METHOD_NOT_ALLOWED';
  if (s === 301 || s === 302) return 'REDIRECT';
  return 'OTHER_' + s;
}

const buckets = {};
for (const r of all) {
  const c = classify(r);
  (buckets[c] = buckets[c] || []).push(r);
}

const out = {};
for (const [k, arr] of Object.entries(buckets)) {
  out[k] = { count: arr.length, examples: arr.slice(0, 400).map((r) => ({
    method: r.method, path: r.path, role: r.role,
    anon: r.anonStatus, authed: r.authStatus,
    body: String(r.authBody || '').slice(0, 180)
  })) };
}

fs.writeFileSync('docs/FLOWS/_verification/analysis.json', JSON.stringify(out, null, 1));

console.log('TOTAL', all.length);
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(24), v.count);

console.log('\n=== FAILING 5XX ===');
for (const r of (buckets.FAILING_5XX || [])) console.log(`${r.method} ${r.path} [${r.role}] ${r.authStatus} :: ${String(r.authBody).slice(0, 200)}`);

console.log('\n=== AUTH_BLOCKED (token present but 401) ===');
for (const r of (buckets.AUTH_BLOCKED || []).slice(0, 40)) console.log(`${r.method} ${r.path} [${r.role}] :: ${String(r.authBody).slice(0, 140)}`);

console.log('\n=== METHOD_NOT_ALLOWED ===');
for (const r of (buckets.METHOD_NOT_ALLOWED || [])) console.log(`${r.method} ${r.path} :: ${String(r.authBody).slice(0, 140)}`);