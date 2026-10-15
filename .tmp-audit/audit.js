/* .tmp-audit/audit.js — full-library status sweep (local-first).
 *
 * Runs every modules.json entry through the same Sora-contract pipeline the
 * status server uses (search → details → episodes/stream | chapters/text |
 * chapters/images), but loads manifests/scripts from the working tree first
 * so uncommitted fixes are reflected. Classifies each module:
 *
 *   working        terminal step of the contract returned real data
 *   no-results     search ok but zero items
 *   search-broken  upstream unreachable / CF-challenged / markup gone
 *   stream-broken  video module, search ok, extractStreamUrl failed/empty
 *   text-broken    novel module, search ok, extractText failed/empty
 *   images-broken  manga module, search ok, extractImages failed/empty
 *   load-error     manifest or script could not be loaded at all
 *
 * Flags: discontinued, external (manifest lives in another repo), needs_review.
 *
 * Usage:  node .tmp-audit/audit.js [concurrency] [only-id1,only-id2]
 *           [--active] [--discontinued]
 * Output:  .tmp-audit/audit-results.jsonl  +  .tmp-audit/audit-summary.txt
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { runMediaTest, withTimeout } = require(path.join(ROOT, 'server.js'));

const OUT = path.join(__dirname, 'audit-results.jsonl');
const SUMMARY = path.join(__dirname, 'audit-summary.txt');
const STEP_TIMEOUT = Number(process.env.STEP_TIMEOUT_MS) || 60000;
const MODULE_TIMEOUT = 150000;

const argConc = process.argv[2];
const CONCURRENCY = argConc ? Number(argConc) : 4;
const filter = process.argv[3] ? process.argv[3].split(',') : null;
const activeOnly = process.argv.includes('--active');
const discontinuedOnly = process.argv.includes('--discontinued');

const OUR_REPO = '/xdfkenny/xdfkenny-sora-modules/';

function isExternal(entry) {
  return !(entry.manifestUrl || '').includes(OUR_REPO);
}

/* Classify one runMediaTest result into a status + short reason. */
function classify(entry, r) {
  const ext = isExternal(entry);
  const disc = entry.discontinued === true;
  const rec = entry.needs_review === true;

  if (r.search && r.search.ok === false) {
    if (/No se pudo cargar/.test(r.search.error || '')) {
      return { status: 'load-error', reason: (r.search.error || '').slice(0, 160), ext, disc, rec };
    }
    return { status: 'search-broken', reason: (r.search.error || '').slice(0, 160), ext, disc, rec };
  }

  if (r.search && r.search.count === 0) {
    return { status: 'no-results', reason: 'search returned 0 items', ext, disc, rec };
  }

  // Terminal step depends on the contract.
  const isNovel = r.text !== undefined;
  const isManga = r.images !== undefined;
  let status = 'working';
  let reason = '';

  if (isNovel) {
    if (r.text && r.text.ok) { status = 'working'; reason = 'text ' + r.text.htmlLength + 'B/' + r.text.images + 'img'; }
    else { status = 'text-broken'; reason = r.text ? ('text fail: ' + (r.text.error || r.text.sample || 'empty')) : 'text missing'; }
  } else if (isManga) {
    if (r.images && r.images.ok) { status = 'working'; reason = 'images ' + r.images.count; }
    else { status = 'images-broken'; reason = r.images ? ('images fail: ' + (r.images.error || '0 imgs')) : 'images missing'; }
  } else {
    // video / movie / show
    if (r.stream && r.stream.ok && r.stream.count > 0) {
      status = 'working'; reason = 'stream x' + r.stream.count + ' → ' + ((r.stream.items && r.stream.items[0] && r.stream.items[0].url) || '');
    } else if (r.stream && r.stream.ok === false) {
      status = 'stream-broken'; reason = (r.stream.error || '').slice(0, 160);
    } else if (r.episodes && r.episodes.ok === false && r.stream && r.stream.ok === false) {
      status = 'stream-broken'; reason = 'eps fail: ' + (r.episodes.error || '') + ' / stream fail: ' + (r.stream.error || '');
    } else {
      // episodes empty + stream empty but no hard error → treat as broken, not working
      status = 'stream-broken'; reason = 'no usable stream (eps=' + (r.episodes ? r.episodes.count : '?') + ')';
    }
  }
  return { status, reason, ext, disc, rec };
}

async function testOne(entry) {
  const keyword = (entry.sampleQuery && String(entry.sampleQuery).trim()) ? String(entry.sampleQuery).trim() : 'one piece';
  const t0 = Date.now();
  let r = null;
  let crashed = null;
  try {
    r = await withTimeout(runMediaTest(entry, keyword), MODULE_TIMEOUT, 'module');
  } catch (e) {
    crashed = (e && e.message) ? e.message : String(e);
  }
  const ms = Date.now() - t0;
  let c;
  if (crashed) c = { status: 'load-error', reason: 'driver: ' + crashed.slice(0, 160), ext: isExternal(entry), disc: entry.discontinued === true, rec: entry.needs_review === true };
  else c = classify(entry, r);

  const line = {
    id: entry.id, name: entry.name, category: entry.category,
    discontinued: c.disc, external: c.ext, needs_review: c.rec,
    keyword, ms, status: c.status, reason: c.reason,
    search: r ? (r.search ? (r.search.ok ? 'OK:' + r.search.count : 'FAIL') : '–') : '–',
    stream: r && r.stream ? (r.stream.ok ? 'OK:' + r.stream.count : 'FAIL') : undefined,
    streamFirst: r && r.stream && r.stream.ok && Array.isArray(r.stream.items) && r.stream.items[0] ? r.stream.items[0].url : null,
    text: r && r.text ? (r.text.ok ? 'OK:' + r.text.htmlLength : 'FAIL') : undefined,
    images: r && r.images ? (r.images.ok ? 'OK:' + r.images.count : 'FAIL') : undefined,
  };
  fs.appendFileSync(OUT, JSON.stringify(line) + '\n');
  console.log(
    (c.disc ? '[D]' : c.ext ? '[E]' : '   ') + (c.rec ? '*' : ' ') +
    ' ' + entry.id.padEnd(26) + ' ' + c.status.padEnd(14) + ' ' + String(ms / 1000).padStart(6) + 's  ' +
    'search=' + String(line.search).padEnd(6) + ' ' + (line.reason || '').slice(0, 90)
  );
  return line;
}

async function main() {
  fs.writeFileSync(OUT, ''); // fresh run
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'modules.json'), 'utf8'));
  let entries = index.modules.filter(m => m.id);
  if (discontinuedOnly) entries = entries.filter(m => m.discontinued === true);
  else if (activeOnly) entries = entries.filter(m => !m.discontinued);
  else entries = entries.slice().sort((a, b) => Number(a.discontinued) - Number(b.discontinued)); // active first
  if (filter) entries = entries.filter(m => filter.includes(m.id));

  console.log('audit: ' + entries.length + ' modules, concurrency ' + CONCURRENCY +
    (discontinuedOnly ? ' (discontinued only)' : activeOnly ? ' (active only)' : '') + '\n');

  let next = 0;
  const lines = [];
  const workers = Array.from({ length: Math.min(CONCURRENCY, entries.length) }, async () => {
    while (next < entries.length) { const i = next++; lines.push(await testOne(entries[i])); }
  });
  await Promise.all(workers);

  // summary (line fields are discontinued/external — keep in sync with testOne)
  const by = {};
  for (const l of lines) by[l.status] = (by[l.status] || 0) + 1;
  const active = lines.filter(l => !l.discontinued);
  const actionable = active.filter(l => l.status !== 'working' && !l.external && l.status !== 'load-error');
  const s = [];
  s.push('AUDIT SUMMARY — ' + new Date().toISOString());
  s.push('total: ' + lines.length + '   (discontinued: ' + lines.filter(l => l.discontinued).length +
    ', external: ' + lines.filter(l => l.external).length + ', active+local: ' + active.filter(l => !l.external).length + ')');
  s.push('status counts: ' + Object.entries(by).map(([k, v]) => k + '=' + v).join('  '));
  s.push('\nWORKING (active+local): ' + active.filter(l => !l.external && l.status === 'working').length);
  s.push('  ' + active.filter(l => !l.external && l.status === 'working').map(l => l.id).join(', '));
  s.push('\nACTIONABLE (active, local, broken, fixable-or-recordable):');
  for (const l of actionable.sort((a, b) => Number(b.needs_review) - Number(a.needs_review))) {
    s.push('  [' + l.status + '] ' + l.id + (l.needs_review ? ' (needs_review)' : '') + ' — ' + (l.reason || '').slice(0, 80));
  }
  s.push('\nEXTERNAL (other repos — cannot fix here):');
  for (const l of lines.filter(x => x.external && x.status !== 'working' && !x.discontinued)) {
    s.push('  [' + l.status + '] ' + l.id + ' — ' + (l.reason || '').slice(0, 80));
  }
  s.push('\nDISCONTINUED:');
  for (const l of lines.filter(x => x.discontinued)) {
    s.push('  [' + l.status + '] ' + l.id + ' — ' + (l.reason || '').slice(0, 80));
  }
  fs.writeFileSync(SUMMARY, s.join('\n') + '\n');
  console.log('\n' + s.join('\n'));
  console.log('\nresults → ' + OUT + '\nsummary → ' + SUMMARY);
}

main().catch(e => { console.error(e); process.exit(1); });
