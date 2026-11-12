import fs from 'fs';
// Check openapi.yaml 
const c = fs.readFileSync('openapi.yaml','utf-8');
const lines = c.split('\n');
// Find all entries that have 'business-registry' in the path key (top level)
const hits = [];
lines.forEach((l,i) => {
  if (l.match(/^  ['"]{0,1}\/api\/business-registry['"]{0,1}:/)) {
    hits.push({i: i+1, l: l.trim()});
    // Show next 3 lines
    for(let j=1; j<=3; j++) hits.push({i:i+1+j, l: '  ' + lines[i+j]?.trim()});
  }
});
hits.forEach(h => console.log(h.i + ': ' + h.l));
