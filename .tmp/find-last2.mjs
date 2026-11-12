import fs from 'fs';
const c = fs.readFileSync('openapi.yaml','utf-8');
const lines = c.split('\n');

const brExists = lines.some(l => l.trim() === '/api/business-registry:');
console.log('POST /api/business-registry entry exists:', brExists);

const putPromoExists = lines.some(l => l.includes("seller/{sellerId}/promotion-offer:"));
console.log('PUT promotion-offer entry exists:', putPromoExists);

// Find where to insert PUT promotion-offer (after the POST /close route)
const closeIdx = lines.findIndex(l => l.includes('promotion-offer/close'));
console.log('promotion-offer/close at line', closeIdx + 1, ':', lines[closeIdx]?.trim()?.slice(0, 60));

// Find next top-level route after close
let afterClose = closeIdx + 1;
while (afterClose < lines.length && !lines[afterClose].match(/^  ['"]?\/api\//)) afterClose++;
console.log('Next route after close at line', afterClose + 1, ':', lines[afterClose]?.trim()?.slice(0, 60));
