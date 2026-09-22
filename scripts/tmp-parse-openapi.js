const fs = require('fs');
const yaml = require('js-yaml');

const doc = yaml.load(fs.readFileSync('openapi.yaml', 'utf8'));
const paths = doc.paths || {};
const out = [];
for (const p of Object.keys(paths)) {
  const item = paths[p];
  for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
    if (item[m]) {
      const op = item[m];
      out.push({
        path: p,
        method: m.toUpperCase(),
        operationId: op.operationId || null,
        summary: (op.summary || '').slice(0, 100),
        tags: op.tags || [],
        security: op.security || item.security || null,
        params: (item.parameters || []).concat(op.parameters || []).map((x) => x.name)
      });
    }
  }
}
fs.writeFileSync('docs/_openapi-endpoints.json', JSON.stringify(out, null, 1));
console.log('OPENAPI_ENDPOINTS=' + out.length);
const byTag = {};
for (const e of out) (e.tags[0] || 'untagged').split(/[\s/]+/).forEach((t) => { byTag[t] = (byTag[t] || 0) + 1; });
