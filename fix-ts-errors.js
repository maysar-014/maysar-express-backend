#!/usr/bin/env node

/**
 * Automated TypeScript Error Fixer
 * Fixes common patterns in the codebase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

let filesModified = 0;
let errorsFixed = 0;

function log(message) {
  if (VERBOSE) console.log(message);
}

function findFiles(dir, pattern, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(file)) {
        findFiles(filePath, pattern, results);
      }
    } else if (file.match(pattern)) {
      results.push(filePath);
    }
  }
  
  return results;
}

function fixFile(filePath, fixes) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let fixCount = 0;
  
  for (const fix of fixes) {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      fixCount++;
      log(`  Applied fix: ${fix.description}`);
    }
  }
  
  if (modified && !DRY_RUN) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    errorsFixed += fixCount;
  }
  
  return { modified, fixCount };
}

// Fix patterns
const DTO_FIXES = [
  {
    description: 'Add definite assignment to DTO properties',
    pattern: /^(\s+)(\w+):\s*(string|number|boolean|Date);$/gm,
    replacement: '$1$2!: $3;'
  }
];

const TEST_FIXES = [
  {
    description: 'Fix Post.create() calls missing type parameter',
    pattern: /Post\.create\(\{\s*id:\s*'([^']+)',\s*authorId:\s*'([^']+)',\s*content:\s*'([^']+)'\s*\}\)/g,
    replacement: "Post.create({ id: '$1', authorId: '$2', content: '$3', type: PostType.TEXT })"
  },
  {
    description: 'Add PostType import to test files',
    pattern: /(import\s+\{\s*Post\s*\}\s+from\s+'[^']+';)/g,
    replacement: "$1\nimport { PostType } from '../post.entity';"
  }
];

const ACCESSOR_FIXES = [
  {
    description: 'Fix getter calls with parentheses',
    pattern: /\.isPublished\(\)/g,
    replacement: '.isPublished'
  },
  {
    description: 'Fix isOnHold getter calls',
    pattern: /\.isOnHold\(\)/g,
    replacement: '.isOnHold'
  }
];

console.log('🔧 TypeScript Error Auto-Fixer\n');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

// Fix DTO files
console.log('📝 Fixing DTO files...');
const dtoFiles = findFiles('services', /\.dto\.ts$/);
for (const file of dtoFiles) {
  log(`Processing: ${file}`);
  const result = fixFile(file, DTO_FIXES);
  if (result.modified) {
    console.log(`  ✅ Fixed ${result.fixCount} issues in ${path.basename(file)}`);
  }
}

// Fix test files
console.log('\n🧪 Fixing test files...');
const testFiles = findFiles('services', /\.test\.ts$/);
for (const file of testFiles) {
  log(`Processing: ${file}`);
  const result = fixFile(file, TEST_FIXES);
  if (result.modified) {
    console.log(`  ✅ Fixed ${result.fixCount} issues in ${path.basename(file)}`);
  }
}

// Fix accessor calls
console.log('\n🔍 Fixing accessor calls...');
const tsFiles = findFiles('services', /\.ts$/);
for (const file of tsFiles) {
  if (file.includes('.test.ts') || file.includes('.dto.ts')) continue;
  log(`Processing: ${file}`);
  const result = fixFile(file, ACCESSOR_FIXES);
  if (result.modified) {
    console.log(`  ✅ Fixed ${result.fixCount} issues in ${path.basename(file)}`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Files modified: ${filesModified}`);
console.log(`  Errors fixed: ${errorsFixed}`);

if (DRY_RUN) {
  console.log('\n⚠️  This was a dry run. No files were actually modified.');
  console.log('   Run without --dry-run to apply changes.');
}

console.log('\n✨ Done!');
