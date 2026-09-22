const fs = require('fs');
const path = require('path');

const results = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (f.endsWith('.routes.ts')) results.push(p);
  }
}
walk('services');

const out = {};
for (const file of results) {
  const src = fs.readFileSync(file, 'utf8');
  const parts = file.split(path.sep);
  const svc = parts[1];
  out[svc] = out[svc] || [];
  const lines = src.split(/\r?\n/);
  lines.forEach((ln, i) => {
    const m = ln.match(/router\.(get|post|put|patch|delete|all)\s*\(\s*['"]([^'"]+)['"](.*)/);
    if (m) {
      const after = lines.slice(i, i + 8).join(' ');
      const auth = {
        authenticate: /authenticate|requireAuth|authMiddleware|passport/.test(after + ln),
        authorize: /authorize|requireRole|roles|permissions?\./.test(after + ln),
        adminish: /admin/i.test(m[2])
      };
      out[svc].push({
        file: parts.slice(1).join('/'),
        method: m[1].toUpperCase(),
        path: m[2],
        auth,
        line: i + 1
      });
    }
  });
}

fs.writeFileSync('docs/_route-inventory-raw.json', JSON.stringify(out, null, 1));
let total = 0;
const summary = [];
for (const k in out) {
  total += out[k].length;
  summary.push(`${k}=${out[k].length}`);
}
console.log('TOTAL_ROUTES=' + total);
console.log(summary.join('\n'));
