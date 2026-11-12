import fs from 'fs';
const c = fs.readFileSync('openapi.yaml','utf-8');
const lines = c.split('\n');
const hits = lines.map((l,i)=>({l,i})).filter(({l})=>l.includes('business-registry:') && l.startsWith('  /'));
hits.forEach(({l,i})=>console.log((i+1)+': '+JSON.stringify(l)));
// Also check api-contract.yaml
const c2 = fs.readFileSync('api-contract.yaml','utf-8');
const lines2 = c2.split('\n');
const hits2 = lines2.map((l,i)=>({l,i})).filter(({l})=>l.includes('/api/business-registry') && !l.includes('{') && l.startsWith('  '));
hits2.slice(0,3).forEach(({l,i})=>console.log('contract line '+(i+1)+': '+JSON.stringify(l)));
