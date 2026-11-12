const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'docs', 'FLOWS', '_verification', 'raw');
const roles = {};
let ops = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  try {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (Array.isArray(j)) for (const e of j) { ops++; if (e.role) roles[e.role] = (roles[e.role] || 0) + 1; }
  } catch (e) {}
}
console.log('ops', ops);
console.log(JSON.stringify(roles, null, 1));
