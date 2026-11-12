const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'docs', 'FLOWS', '_verification', 'raw');

// Aggregate: per module prefix -> per endpoint -> {method, probes: {role: status}, requiredRoles}
const rows = [];
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
  if (!Array.isArray(j)) continue;
  for (const e of j) {
    if (!e || !e.path || !e.method) continue;
    let reqRoles = '';
    if (e.authStatus === 403 && e.authBody) {
      try {
        const b = JSON.parse(e.authBody);
        const d = b && b.error && b.error.details;
        if (d && d.requiredRoles) reqRoles = d.requiredRoles.join('+');
      } catch (x) {}
    }
    rows.push({
      module: e.module,
      path: e.path,
      method: e.method,
      role: e.role || 'anon+auth',
      status: e.authStatus,
      anon: e.anonStatus,
      reqRoles,
    });
  }
}

// group by module
const byMod = {};
for (const r of rows) (byMod[r.module] = byMod[r.module] || []).push(r);

const out = [];
for (const mod of Object.keys(byMod).sort()) {
  out.push(`=== ${mod} ===`);
  const seen = new Set();
  for (const r of byMod[mod].sort((a, b) => String(a.path + a.method).localeCompare(String(b.path + b.method)))) {
    const key = r.path + r.method;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`  ${r.method.padEnd(6)} ${r.path}  probed=${r.role} status=${r.status} anon=${r.anon}${r.reqRoles ? ' requiredRoles=' + r.reqRoles : ''}`);
  }
}
fs.writeFileSync('tmp-sweep-matrix.txt', out.join('\n'));
console.log('modules:', Object.keys(byMod).length, 'rows:', rows.length);
