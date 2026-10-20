/* .tmp-audit/sweep.js — full library sweep driver.
 *
 * POSTs every modules.json entry through the server.js /api/test harness
 * (search → details → episodes/stream | chapters/text | chapters/images)
 * and records per-module results to .tmp-audit/sweep-results.jsonl.
 *
 * Usage: node .tmp-audit/sweep.js [concurrency] [only-id1,only-id2]
 * Active (non-discontinued) modules are swept first; a second pass
 * `--discontinued` flag re-sweeps only the discontinued ones.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8765;
const OUT = path.join(__dirname, 'sweep-results.jsonl');

const argConc = process.argv[2];
const CONCURRENCY = argConc ? Number(argConc) : 4;
const filter = process.argv[3] ? process.argv[3].split(',') : null;
const discontinuedOnly = process.argv.includes('--discontinued');
const activeOnly = process.argv.includes('--active');

const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'modules.json'), 'utf8'));
let entries = index.modules.filter(m => m.id);
if (discontinuedOnly) entries = entries.filter(m => m.discontinued === true);
else if (activeOnly) entries = entries.filter(m => !m.discontinued);
else entries = entries.slice().sort((a, b) => Number(a.discontinued) - Number(b.discontinued)); // active first
if (filter) entries = entries.filter(m => filter.includes(m.id));

console.log('sweeping ' + entries.length + ' modules at concurrency ' + CONCURRENCY +
  (discontinuedOnly ? ' (discontinued only)' : activeOnly ? ' (active only)' : ''));

async function testOne(entry) {
  const keyword = (entry.sampleQuery && String(entry.sampleQuery).trim()) ? entry.sampleQuery : 'one piece';
  const t0 = Date.now();
  let result = null;
  let httpStatus = 0;
  try {
    const resp = await fetch('http://127.0.0.1:' + PORT + '/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, keyword })
    });
    httpStatus = resp.status;
    const body = await resp.json().catch(() => ({}));
    result = body.result || body;
  } catch (e) {
    result = { error: 'sweep driver: ' + (e && e.message ? e.message : e) };
  }
  const ms = Date.now() - t0;

  // summarize the important fields so the JSONL line is readable
  const s = (x) => (x && x.ok !== undefined ? (x.ok ? 'OK' : 'FAIL') + (x.count !== undefined ? ':' + x.count : '') + (x.error ? '[' + String(x.error).slice(0, 120) + ']' : '') : '–');
  const line = {
    id: entry.id,
    name: entry.name,
    category: entry.category,
    discontinued: entry.discontinued === true,
    needs_review: entry.needs_review === true,
    keyword,
    ms,
    httpStatus,
    loadError: result && result.search && result.search.ok === false && /No se pudo cargar/.test(result.search.error || '') ? result.search.error : null,
    search: s(result && result.search),
    details: s(result && result.details),
    episodes: s(result && result.episodes),
    stream: s(result && result.stream),
    streamFirst: result && result.stream && result.stream.ok && Array.isArray(result.stream.items) && result.stream.items[0] ? result.stream.items[0].url : null,
    chapters: s(result && result.chapters),
    text: s(result && result.text),
    images: s(result && result.images),
  };
  fs.appendFileSync(OUT, JSON.stringify(line) + '\n');
  console.log('[' + line.discontinued + ']' + (line.needs_review ? '*' : ' ') +
    ' ' + entry.id.padEnd(28) + ' ' + String(line.ms / 1000).padStart(7) + 's  ' +
    'search=' + line.search.padEnd(18) + ' details=' + String(line.details).padEnd(12) +
    (line.episodes ? ' eps=' + String(line.episodes).padEnd(14) : '') +
    (line.stream ? ' stream=' + String(line.stream).padEnd(14) : '') +
    (line.chapters ? ' ch=' + String(line.chapters).padEnd(14) : '') +
    (line.text ? ' text=' + String(line.text) : '') +
    (line.images ? ' img=' + String(line.images) : ''));
  return line;
}

async function main() {
  let next = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, entries.length) }, async () => {
    while (next < entries.length) {
      const i = next++;
      await testOne(entries[i]);
    }
  });
  await Promise.all(workers);
  console.log('done — results in ' + OUT);
}

main().catch(e => { console.error(e); process.exit(1); });
