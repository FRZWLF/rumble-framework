#!/usr/bin/env node
// Docs honesty check for projects without their own doc_anchors test.
//
//   node scripts/check-anchors.mjs <project-dir>
//
// Reads framework.json for the doc paths, then fails (exit 1) when
//   - a D-/G-/M- reference anywhere in the docs, README or guide files has no row in the
//     decisions / gaps / measurements doc,
//   - a number appears twice (rows out of numeric order are printed as notes),
//   - a relative markdown link in the docs points at a file that does not exist.
// "A reference without an anchor is a red finding" — this is that rule as a command.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const projectDir = resolve(process.argv[2] || '.');
const cfg = JSON.parse(readFileSync(join(projectDir, 'framework.json'), 'utf8'));
const prefixes = { D: cfg.docs.decisions, G: cfg.docs.gaps, M: cfg.docs.measurements };
const errors = [];
const notes = [];   // advisory: order (addenda rows may legitimately sit later)

// 1 · which ids exist (a row starts with "| D-001" or a heading/bold "**M-003**" / "### M-003")
const defined = { D: new Set(), G: new Set(), M: new Set() };
for (const [p, file] of Object.entries(prefixes)) {
  const abs = join(projectDir, file);
  if (!existsSync(abs)) { errors.push(`${file}: missing (framework.json docs.*)`); continue; }
  const text = readFileSync(abs, 'utf8');
  const rowRe = new RegExp(`^\\|\\s*~{0,2}(${p}-\\d+)`, 'gm');
  const headRe = new RegExp(`^(?:#{1,6}\\s+|\\*\\*)(${p}-\\d+)`, 'gm');
  let last = 0;
  for (const m of text.matchAll(rowRe)) {
    const n = Number(m[1].slice(2));
    if (defined[p].has(m[1])) errors.push(`${file}: ${m[1]} defined twice`);
    if (n < last) notes.push(`${file}: ${m[1]} out of order (after ${p}-${String(last).padStart(3, '0')})`);
    last = Math.max(last, n); defined[p].add(m[1]);
  }
  for (const m of text.matchAll(headRe)) defined[p].add(m[1]);
}

// 2 · every reference has a row; every relative link resolves
const docsDir = join(projectDir, dirname(cfg.docs.decisions));
const files = [];
const walk = d => { for (const e of readdirSync(d)) { const f = join(d, e); if (statSync(f).isDirectory()) { if (!/node_modules|\.git/.test(e)) walk(f); } else if (f.endsWith('.md')) files.push(f); } };
if (existsSync(docsDir)) walk(docsDir);
for (const g of ['README.md', 'CLAUDE.md', 'AGENTS.md']) if (existsSync(join(projectDir, g))) files.push(join(projectDir, g));

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const rel = f.slice(projectDir.length + 1);
  for (const m of text.matchAll(/\b([DGM])-(\d{3,})\b/g)) {
    const id = `${m[1]}-${m[2]}`;
    if (/x{3}|xxx/.test(id)) continue;
    if (!defined[m[1]].has(id)) errors.push(`${rel}: ${id} has no row in ${prefixes[m[1]]}`);
  }
  for (const m of text.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^[a-z]+:/.test(target)) continue;               // http:, mailto:
    if (!existsSync(resolve(dirname(f), target))) errors.push(`${rel}: link to ${target} does not resolve`);
  }
}

for (const n of notes) console.log(`note: ${n}`);
for (const e of [...new Set(errors)]) console.log(`anchor: ${e}`);
console.log(errors.length ? `${errors.length} anchor error(s)` : `anchors: ${defined.D.size} D · ${defined.G.size} G · ${defined.M.size} M rows, every reference resolves`);
process.exit(errors.length ? 1 : 0);
