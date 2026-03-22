/**
 * export-csv.mjs
 * data.js → data/actors.csv + data/categories.csv
 *
 * Runs automatically via "prebuild" and "predev" npm scripts.
 * Also callable manually: node scripts/export-csv.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { CATS, ACTORS } = await import('../src/data.js');

mkdirSync(join(root, 'data'), { recursive: true });

/* ── CSV helpers ──────────────────────────────────────────────────────────── */
function cell(val) {
  if (val === undefined || val === null) return '';
  const s = String(val);
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}
function row(...vals) { return vals.map(cell).join(','); }
function csv(header, rows) { return [header, ...rows].join('\n') + '\n'; }

/* ── actors.csv ───────────────────────────────────────────────────────────── */
writeFileSync(
  join(root, 'data/actors.csv'),
  csv(
    'name,category,role,tags,link',
    ACTORS.map(a => row(
      a.n, a.c, a.r,
      a.t.join('|'),
      a.link || ''
    ))
  )
);

/* ── categories.csv ───────────────────────────────────────────────────────── */
writeFileSync(
  join(root, 'data/categories.csv'),
  csv(
    'name,color,description',
    Object.entries(CATS).map(([name, cfg]) => row(name, cfg.dot, cfg.desc))
  )
);

console.log('✓  CSV export: data/actors.csv · categories.csv');
