import fs from 'fs';
const c = fs.readFileSync('openapi.yaml','utf-8');
const lines = c.split('\n');
const hits = lines.map((l,i)=>({l,i})).filter(({l})=>l.startsWith('  /api/business') || l.startsWith("  '/api/business"));
hits.slice(0,5).forEach(({l,i})=>console.log((i+1)+': '+l));
