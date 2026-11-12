// Check openapi.yaml BEFORE sync to see if /api/business-registry: entry exists
import fs from 'fs';
const c = fs.readFileSync('openapi.yaml','utf-8');
const lines = c.split('\n');
let count = 0;
lines.forEach((l,i) => {
  const t = l.trim();
  if (t === '/api/business-registry:' || t === "'/api/business-registry':" || l.startsWith('  /api/business-registry:') || l.startsWith("  '/api/business-registry':")) {
    console.log('FOUND at line', i+1, ':', JSON.stringify(l));
    count++;
  }
});
console.log('Total matches:', count);
console.log('Total lines in file:', lines.length);
