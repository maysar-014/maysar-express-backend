import fs from 'fs';
const c = fs.readFileSync('openapi.yaml','utf-8');
const lines = c.split('\n');
lines.forEach((l,i) => {
  if(l.match(/^  \/api\/business-registry:/) || l.match(/^  ['"]\/api\/business-registry['"]:/)) {
    console.log((i+1) + ': ' + l);
    console.log((i+2) + ': ' + lines[i+1]);
    console.log((i+3) + ': ' + lines[i+2]);
  }
});
