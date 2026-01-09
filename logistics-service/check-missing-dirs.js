const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const requiredDirs = [
  'domain/entities',
  'domain/value-objects',
  'domain/engines',
  'domain/policies',
  'domain/algorithms',
  'domain/events',
  'application/use-cases',
  'application/sagas',
  'application/dto',
  'application/mappers',
  'infrastructure/repositories',
  'infrastructure/messaging',
  'infrastructure/providers',
  'infrastructure/cache',
  'api/controllers',
  'api/routes',
  'api/validators'
];

console.log('Checking required directories...\n');

let allPresent = true;
requiredDirs.forEach(dir => {
  const fullPath = path.join(SRC_DIR, dir);
  const exists = fs.existsSync(fullPath);
  const isDir = exists && fs.statSync(fullPath).isDirectory();

  console.log(`${exists && isDir ? '✅' : '❌'} ${dir}`);

  if (!exists || !isDir) {
    allPresent = false;
  }
});

console.log(`\nResult: ${allPresent ? 'All directories present ✅' : 'Some directories missing ❌'}`);
