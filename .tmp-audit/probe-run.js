/* .tmp-audit/probe-run.js — run a module's exported fns with console visible.
 * Usage: node .tmp-audit/probe-run.js <moduleId> <keyword>
 * Loads manifest+script from the working tree (like the harness) and prints
 * each contract step's raw output so the true failure reason is visible.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// Minimal fetchv2 shim that mirrors server.js (cookie jar + header filter) but
// keeps the module's own console.log visible.
const FORBIDDEN = new Set(['host','connection','content-length','accept-encoding','transfer-encoding','upgrade']);

function localPathFromOurRawUrl(url) {
  const marker = '/xdfkenny/xdfkenny-sora-modules/main/';
  const u = String(url || '');
  const i = u.indexOf(marker);
  if (i < 0) return null;
  const rel = u.slice(i + marker.length).split('?')[0];
  const p = path.join(ROOT, rel);
  return p.startsWith(ROOT + path.sep) ? p : null;
}

async function loadUrl(url) {
  const local = localPathFromOurRawUrl(url);
  if (local && fs.existsSync(local)) return fs.readFileSync(local, 'utf8');
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  return r.text();
}

function makeFetcher() {
  const jar = new Map();
  return async function soraFetch(url, headers, method, body) {
    const clean = {};
    let hasCookie = false;
    for (const k in (headers || {})) {
      const lk = String(k).toLowerCase();
      if (FORBIDDEN.has(lk)) continue;
      if (lk === 'cookie') hasCookie = true;
      clean[k] = headers[k];
    }
    if (jar.size && !hasCookie) clean['Cookie'] = [...jar].map(([n, v]) => n + '=' + v).join('; ');
    const r = await fetch(url, { method: method || 'GET', redirect: 'follow', headers: clean, body: body ?? undefined });
    const setc = r.headers.get('set-cookie');
    if (setc) for (const part of String(setc).split(/\r?\n/)) {
      const kv = part.split(';')[0]; const eq = kv.indexOf('=');
      if (eq > 0) jar.set(kv.slice(0, eq).trim(), kv.slice(eq + 1).trim());
    }
    const text = await r.text();
    return {
      ok: r.status >= 200 && r.status < 300, status: r.status, url: r.url,
      headers: r.headers, text: async () => text,
      json: async () => JSON.parse(text)
    };
  };
}

const id = process.argv[2];
const keyword = process.argv[3] || 'one piece';
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'modules.json'), 'utf8'));
const entry = index.modules.find(m => m.id === id);
if (!entry) { console.error('module not found:', id); process.exit(1); }

(async () => {
  const manifest = JSON.parse(await loadUrl(entry.manifestUrl));
  const src = await loadUrl(manifest.scriptUrl || manifest.scriptURL);
  const fetcher = makeFetcher();
  const g = new Function('fetch','fetchv2','window','console','location',
    src + '\n;return {searchResults,extractDetails,' +
      'extractEpisodes: typeof extractEpisodes !== "undefined" ? extractEpisodes : null,' +
      'extractStreamUrl: typeof extractStreamUrl !== "undefined" ? extractStreamUrl : null,' +
      'extractChapters: typeof extractChapters !== "undefined" ? extractChapters : null,' +
      'extractText: typeof extractText !== "undefined" ? extractText : null};')
    (fetcher, fetcher, {fetch:fetcher, fetchv2:fetcher}, console, undefined);

  const J = (v) => { try { return JSON.parse(typeof v === 'string' ? v : JSON.stringify(v)); } catch(e){ return v; } };

  console.log('== search ==');
  let results = J(await g.searchResults(keyword));
  if (!Array.isArray(results)) results = [results];
  console.log('count:', results.length, 'first:', JSON.stringify(results[0]));
  if (!results.length || !(results[0].href || results[0].id)) { console.log('STOP: no usable search item'); return; }
  const key = results[0].href || results[0].id;
  console.log('\n== details ==');
  console.log(JSON.stringify(J(await g.extractDetails(key))).slice(0, 400));
  console.log('\n== episodes ==');
  if (g.extractEpisodes) {
    let eps = J(await g.extractEpisodes(key));
    if (!Array.isArray(eps)) eps = [eps];
    console.log('count:', eps.length, 'first:', JSON.stringify(eps[0]).slice(0,200));
    const epKey = (eps[0] && (eps[0].href || eps[0].id)) || key;
    console.log('\n== stream ==');
    const raw = await g.extractStreamUrl(epKey);
    const parsed = J(raw);
    const streams = Array.isArray(parsed) ? parsed : (parsed && parsed.streams) || [];
    console.log('streams:', JSON.stringify(streams).slice(0, 500));
  }
})().catch(e => { console.error('DRIVER ERROR:', e); process.exit(1); });
