import fs from 'fs';
const c = fs.readFileSync('openapi.yaml','utf-8');
const lines = c.split('\n');

// Check POST /api/business-registry
const brLines = [];
lines.forEach((l,i) => { if(l.includes('/api/business-registry:') || l.includes('/api/business-registry\':')) brLines.push((i+1) + ': ' + l.trim().slice(0,80)); });
console.log('=== /api/business-registry entries ===');
brLines.forEach(l => console.log(l));

// Check PUT promotion-offer
const promoLines = [];
lines.forEach((l,i) => { if(l.includes('promotion-offer') && l.match(/^  /)) promoLines.push((i+1) + ': ' + l.trim().slice(0,80)); });
console.log('\n=== promotion-offer entries ===');
promoLines.forEach(l => console.log(l));
