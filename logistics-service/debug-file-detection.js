const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const APPLICATION_DIR = path.join(SRC_DIR, 'application');
const INFRASTRUCTURE_DIR = path.join(SRC_DIR, 'infrastructure');

console.log('Debugging file detection...\n');

// Test findFilesRecursive function
function findFilesRecursive(dir, pattern) {
  const files = [];

  function traverse(currentDir) {
    if (!fs.existsSync(currentDir)) {
      console.log(`Directory does not exist: ${currentDir}`);
      return;
    }

    const items = fs.readdirSync(currentDir);

    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile() && pattern.test(item)) {
        files.push(fullPath);
      }
    });
  }

  traverse(dir);
  return files;
}

console.log('SRC_DIR:', SRC_DIR);
console.log('APPLICATION_DIR:', APPLICATION_DIR);
console.log('INFRASTRUCTURE_DIR:', INFRASTRUCTURE_DIR);

console.log('\nApplication sagas:');
const sagaFiles = findFilesRecursive(path.join(APPLICATION_DIR, 'sagas'), /\.ts$/);
console.log('Found saga files:', sagaFiles.length);
sagaFiles.forEach(file => console.log('  ', path.relative(SRC_DIR, file)));

console.log('\nInfrastructure repositories:');
const repoFiles = findFilesRecursive(path.join(INFRASTRUCTURE_DIR, 'repositories'), /\.ts$/);
console.log('Found repo files:', repoFiles.length);
repoFiles.forEach(file => console.log('  ', path.relative(SRC_DIR, file)));

console.log('\nInfrastructure providers:');
const providerFiles = findFilesRecursive(path.join(INFRASTRUCTURE_DIR, 'providers'), /\.ts$/);
console.log('Found provider files:', providerFiles.length);
providerFiles.forEach(file => console.log('  ', path.relative(SRC_DIR, file)));
