import fs from 'fs';
const c = fs.readFileSync('openapi.yaml','utf-8');
const lines = c.split('\n');
lines.forEach((l,i) => {
  if (l.match(/^  ['"]?\/api\/enabler\/enablers\/seller/) && l.includes('promotion-offer')) {
    console.log((i+1) + ': ' + l.trim().slice(0, 80));
  }
});
// Also check if /api/business-registry: (no trailing path) already exists
lines.forEach((l,i) => {
  if (l.trim() === '/api/business-registry:') {
    console.log('Found /api/business-registry: at line', i+1);
  }
});
