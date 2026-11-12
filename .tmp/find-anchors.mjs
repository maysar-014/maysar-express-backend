import fs from 'fs';
const c = fs.readFileSync('openapi.yaml','utf-8');
const lines = c.split('\n');

// Find the line after the last analytics route (before next service)
const analyticsRouteLines = lines.map((l,i) => ({l,i})).filter(({l}) => l.match(/^  ['"]{0,1}\/api\/analytics/));
const lastAnalytics = analyticsRouteLines[analyticsRouteLines.length - 1];
console.log('Last analytics route at line', lastAnalytics.i+1, ':', lastAnalytics.l.trim().slice(0,60));

// What line follows the last analytics block?
let afterAnalytics = lastAnalytics.i + 1;
while(afterAnalytics < lines.length && !lines[afterAnalytics].match(/^  ['"]{0,1}\/api\/[^a]/)) afterAnalytics++;
console.log('Next service after analytics at line', afterAnalytics+1, ':', lines[afterAnalytics]?.trim()?.slice(0,60));

// Last catalog seller-locations route
const slRoutes = lines.map((l,i) => ({l,i})).filter(({l}) => l.match(/^  ['"]{0,1}\/api\/catalog\/seller-locations/));
if(slRoutes.length > 0) {
  const last = slRoutes[slRoutes.length-1];
  console.log('Last seller-locations route at line', last.i+1, ':', last.l.trim().slice(0,60));
}

// Last enabler route
const enRoutes = lines.map((l,i) => ({l,i})).filter(({l}) => l.match(/^  ['"]{0,1}\/api\/enabler/));
const lastEn = enRoutes[enRoutes.length-1];
console.log('Last enabler route at line', lastEn.i+1, ':', lastEn.l.trim().slice(0,60));
// What follows enabler?
let afterEn = lastEn.i + 1;
while(afterEn < lines.length && !lines[afterEn].match(/^  ['"]{0,1}\/api\/[^e]/)) afterEn++;
console.log('Next service after enabler at line', afterEn+1, ':', lines[afterEn]?.trim()?.slice(0,60));

// Last inventory route
const invRoutes = lines.map((l,i) => ({l,i})).filter(({l}) => l.match(/^  ['"]{0,1}\/api\/inventory/));
const lastInv = invRoutes[invRoutes.length-1];
console.log('Last inventory route at line', lastInv.i+1, ':', lastInv.l.trim().slice(0,60));
// What follows inventory?
let afterInv = lastInv.i + 1;
while(afterInv < lines.length && !lines[afterInv].match(/^  ['"]{0,1}\/api\/[^i]/)) afterInv++;
console.log('Next service after inventory at line', afterInv+1, ':', lines[afterInv]?.trim()?.slice(0,60));

// Find /api/business-registry first route
const brFirst = lines.findIndex(l => l.match(/^  ['"]{0,1}\/api\/business-registry[/'"]/));
console.log('First business-registry route at line', brFirst+1, ':', lines[brFirst]?.trim()?.slice(0,60));

// Last user route
const userRoutes = lines.map((l,i) => ({l,i})).filter(({l}) => l.match(/^  ['"]{0,1}\/api\/user/));
const lastUser = userRoutes[userRoutes.length-1];
console.log('Last user route at line', lastUser.i+1, ':', lastUser.l.trim().slice(0,60));
