const fs = require('fs');
const eps = JSON.parse(fs.readFileSync('docs/_openapi-endpoints.json', 'utf8'));
const byTag = {};
for (const e of eps) {
  const tag = (e.tags && e.tags[0]) || 'untagged';
  (byTag[tag] = byTag[tag] || []).push(`${e.method} ${e.path}`);
}
const out = [];
for (const tag of Object.keys(byTag).sort()) {
  out.push(`### ${tag} (${byTag[tag].length})`);
  for (const p of byTag[tag].sort()) out.push(`  ${p}`);
}
fs.writeFileSync('tmp-endpoints-by-tag.txt', out.join('\n'));
console.log('tags:', Object.keys(byTag).length, 'total:', eps.length);
