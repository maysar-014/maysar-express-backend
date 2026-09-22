/**
 * Produce a compact, human-readable verification report from analysis.json.
 * Writes docs/FLOWS/_verification/analysis-report.md
 */
const fs = require('fs');
const a = JSON.parse(fs.readFileSync('docs/FLOWS/_verification/analysis.json', 'utf8'));

const lines = [];
lines.push('# Verified Endpoint Sweep — Analysis Report');
lines.push('');
lines.push('Evidence source: `docs/FLOWS/_verification/raw/*.json` (563 OpenAPI operations, live server).');
lines.push('');
lines.push('## Status distribution');
lines.push('');
lines.push('| Status | Count |');
lines.push('| --- | --- |');
const entries = Object.entries(a).sort((x, y) => y[1].count - x[1].count);
for (const [k, v] of entries) lines.push(`| ${k} | ${v.count} |`);
lines.push('');

const show = (key, title, limit) => {
  const b = a[key];
  lines.push(`## ${title} (${b ? b.count : 0})`);
  lines.push('');
  if (!b || !b.count) { lines.push('_None._'); lines.push(''); return; }
  lines.push('| Method | Path | Role | Anon | Authed | Response body |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const r of b.examples.slice(0, limit || 60)) {
    const body = String(r.body || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 150);
    lines.push(`| ${r.method} | \`${r.path}\` | ${r.role} | ${r.anon} | ${r.authed} | ${body} |`);
  }
  lines.push('');
};

show('FAILING_5XX', 'FAILING — 5xx server errors', 100);
show('UNREACHABLE', 'UNREACHABLE — connection failures', 100);
show('AUTH_BLOCKED', 'AUTH BLOCKED — token accepted by login but rejected', 100);
show('PERMISSION_BOUNDARY', 'PERMISSION BOUNDARY — 403 for selected role', 100);
show('METHOD_NOT_ALLOWED', 'METHOD NOT ALLOWED — 405', 100);
show('REDIRECT', 'REDIRECT — 301/302', 50);
lines.push('## RESOURCE ABSENT (404) — count by module');
lines.push('');
const absent = a.RESOURCE_ABSENT ? a.RESOURCE_ABSENT.examples : [];
lines.push(`Total: ${a.RESOURCE_ABSENT ? a.RESOURCE_ABSENT.count : 0}`);
lines.push('');
lines.push('| Method | Path | Example response |');
lines.push('| --- | --- | --- |');
for (const r of absent.slice(0, 120)) {
  const body = String(r.body || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 120);
  lines.push(`| ${r.method} | \`${r.path}\` | ${body} |`);
}
lines.push('');

fs.writeFileSync('docs/FLOWS/_verification/analysis-report.md', lines.join('\n'));
