import fs from 'fs';
const c = fs.readFileSync('openapi.yaml','utf-8');
const lines = c.split('\n');

// Find the analytics/supplier route (before it is where we want platform routes)
const supIdx = lines.findIndex(l => l.includes('/api/analytics/supplier/analytics'));
console.log('analytics/supplier at line', supIdx+1, ':', lines[supIdx]?.trim()?.slice(0,70));

// What was last analytics before supplier?
const lastPreSupplier = lines.map((l,i)=>({l,i})).filter(({l,i})=> i < supIdx && l.match(/^  ['"]?\/api\/analytics/)).pop();
if(lastPreSupplier) console.log('Last analytics before supplier at line', lastPreSupplier.i+1, ':', lastPreSupplier.l.trim().slice(0,70));

// Find the last analytics route overall
const allAnalytics = lines.map((l,i)=>({l,i})).filter(({l})=>l.match(/^  ['"]?\/api\/analytics/));
const lastAn = allAnalytics[allAnalytics.length-1];
console.log('Last analytics route at line', lastAn.i+1, ':', lastAn.l.trim().slice(0,70));

// Find what follows last analytics
let nextIdx = lastAn.i+1;
while(nextIdx < lines.length && !lines[nextIdx].match(/^  ['"]?\/api\/[^a]/)) nextIdx++;
console.log('Next after analytics at line', nextIdx+1, ':', lines[nextIdx]?.trim()?.slice(0,70));

// Find last user route
const allUser = lines.map((l,i)=>({l,i})).filter(({l})=>l.match(/^  ['"]?\/api\/user/));
const lastUser = allUser[allUser.length-1];
console.log('Last user route at line', lastUser.i+1, ':', lastUser.l.trim().slice(0,70));

// Find what follows last user route
let nextUser = lastUser.i+1;
while(nextUser < lines.length && !lines[nextUser].match(/^  ['"]?\/api\/[^u]/)) nextUser++;
console.log('Next after user at line', nextUser+1, ':', lines[nextUser]?.trim()?.slice(0,70));
