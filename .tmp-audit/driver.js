/* Temp audit driver: dedupe modules by script content, run each unique script
   through the server.js /api/test harness, save results incrementally. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const BASE = 'http://localhost:8765';
const CONC = Number(process.env.CONC || 6);
const RESULTS = path.join(__dirname, 'results.json');

const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'modules.json'), 'utf8'));

async function fetchText(url) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  return r.text();
}

async function pool(items, worker, conc) {
  let i = 0;
  const runners = Array.from({ length: Math.min(conc, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try { await worker(items[idx], idx); } catch (e) { console.error('worker err', items[idx] && items[idx].id, e.message); }
    }
  });
  await Promise.all(runners);
}

function kwFor(en) {
  let k = en.sampleQuery;
  if (typeof k !== 'string' || !k.trim() || k === 'undefined') {
    const c = en.category || '';
    k = c.includes('novels') ? 'solo leveling' : c.includes('mangas') ? 'one piece' : 'one piece';
  }
  return k.trim();
}

function summarize(r) {
  if (r.error && !r.result) return 'DRIVER-FAIL';
  const t = r.result || {};
  const parts = [];
  if (t.search) parts.push('S:' + (t.search.ok ? t.search.count : 'ERR'));
  if (t.details) parts.push('D:' + (t.details.ok ? 'ok' : 'ERR'));
  if (t.episodes) parts.push('E:' + (t.episodes.ok ? t.episodes.count : 'ERR'));
  if (t.stream) parts.push('St:' + (t.stream.ok ? t.stream.count : 'ERR'));
  if (t.chapters) parts.push('C:' + (t.chapters.ok ? t.chapters.count : 'ERR'));
  if (t.text) parts.push('T:' + (t.text.ok ? t.text.htmlLength : 'ERR'));
  if (t.images) parts.push('I:' + (t.images.ok ? t.images.count : 'ERR'));
  return parts.join(' ');
}

(async () => {
  console.log('resolving ' + idx.modules.length + ' manifests...');
  const entries = [];
  await pool(idx.modules, async (e) => {
    const rec = { id: e.id, name: e.name, category: e.category, sampleQuery: e.sampleQuery, manifestUrl: e.manifestUrl };
    try {
      const man = JSON.parse(await fetchText(e.manifestUrl));
      const sUrl = man.scriptUrl || man.scriptURL;
      if (!sUrl) throw new Error('manifest has no scriptUrl');
      const src = await fetchText(sUrl);
      rec.scriptUrl = sUrl;
      rec.hash = crypto.createHash('sha1').update(src).digest('hex');
      rec.scriptLen = src.length;
    } catch (err) {
      rec.error = 'load: ' + err.message;
    }
    entries.push(rec);
  }, 12);

  const errored = entries.filter(e => e.error);
  const groups = {};
  for (const en of entries) { if (en.error) continue; (groups[en.hash] = groups[en.hash] || []).push(en); }
  const reps = Object.values(groups).map(g => {
    const rep = g.reduce((a, b) => (a.id.length <= b.id.length ? a : b));
    rep.members = g.map(x => x.id);
    return rep;
  });
  console.log('unique scripts: ' + reps.length + ', load-failures: ' + errored.length);

  const results = [];
  let done = 0;
  await pool(reps, async (r) => {
    const kw = kwFor(r);
    let res;
    try {
      const resp = await fetch(BASE + '/api/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, keyword: kw })
      });
      res = await resp.json();
    } catch (err) {
      res = { ok: false, error: 'driver: ' + err.message };
    }
    const rec = { rep: r.id, keyword: kw, members: r.members, scriptUrl: r.scriptUrl, category: r.category, ...res };
    results.push(rec);
    done++;
    fs.writeFileSync(RESULTS, JSON.stringify({ results, errored }, null, 1));
    console.log('[' + done + '/' + reps.length + '] ' + r.id + (r.members.length > 1 ? ' (+' + (r.members.length - 1) + ' dup)' : '') + ' [' + kw + '] => ' + summarize(rec));
  }, CONC);

  fs.writeFileSync(RESULTS, JSON.stringify({ results, errored }, null, 1));
  console.log('DONE. results: ' + results.length + ' load-failures: ' + errored.length);
})();
