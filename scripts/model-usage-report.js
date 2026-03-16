const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');
const outputPath = path.join(repoRoot, '.codex-model-usage.txt');

const text = fs.readFileSync(schemaPath, 'utf8');
const modelRegex = /^model\s+([A-Za-z0-9_]+)\s*\{/gm;
const models = [];
let match;
while ((match = modelRegex.exec(text)) !== null) {
  models.push(match[1]);
}

const delegates = models.map((name) => name.charAt(0).toLowerCase() + name.slice(1));
const counts = new Map();
models.forEach((name, idx) => counts.set(name, { delegate: delegates[idx], hits: 0 }));

const ignoreDirs = new Set(['node_modules', 'dist', 'coverage', '.git', 'logs', 'reports']);
const includeExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function shouldSkipDir(entry) {
  return ignoreDirs.has(entry);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!includeExt.has(ext)) continue;
      const filePath = path.join(dir, entry.name);
      const content = fs.readFileSync(filePath, 'utf8');
      for (const [modelName, info] of counts.entries()) {
        const re = new RegExp(`\\.${info.delegate}\\b`, 'g');
        const hits = content.match(re);
        if (hits) info.hits += hits.length;
      }
    }
  }
}

walk(repoRoot);

const rows = Array.from(counts.entries()).map(([model, info]) => ({
  model,
  delegate: info.delegate,
  hits: info.hits
}));

rows.sort((a, b) => a.hits - b.hits || a.model.localeCompare(b.model));

const col1 = Math.max('Model'.length, ...rows.map(r => r.model.length));
const col2 = Math.max('Delegate'.length, ...rows.map(r => r.delegate.length));
const col3 = Math.max('Hits'.length, ...rows.map(r => String(r.hits).length));

const lines = [];
lines.push('');
lines.push(
  `${'Model'.padEnd(col1)}  ${'Delegate'.padEnd(col2)}  ${'Hits'.padStart(col3)}`
);
lines.push(
  `${'-'.repeat(col1)}  ${'-'.repeat(col2)}  ${'-'.repeat(col3)}`
);
for (const row of rows) {
  lines.push(
    `${row.model.padEnd(col1)}  ${row.delegate.padEnd(col2)}  ${String(row.hits).padStart(col3)}`
  );
}
lines.push('');

fs.writeFileSync(outputPath, lines.join('\n'));
console.log(`Wrote ${outputPath}`);

