/* Local module test driver — mirrors server.js runMediaTest exactly (curl-first
   fetcher + cookie jar), but loads the script from a LOCAL file so fixes can be
   verified before pushing to GitHub.

   Usage: node localtest.js <path/to/module.js> <video|novel|manga|auto> [keyword]
*/
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const scriptPath = process.argv[2];
let type = process.argv[3] || 'auto';
const keyword = process.argv[4] || 'one piece';

if (!scriptPath) { console.error('usage: node localtest.js <module.js> <video|novel|manga|auto> [keyword]'); process.exit(1); }
const src = fs.readFileSync(path.resolve(scriptPath), 'utf8');

const FORBIDDEN_HEADERS = new Set(['host', 'connection', 'content-length', 'accept-encoding', 'transfer-encoding', 'upgrade']);

function parseHeaderDump(dump) {
  const map = new Map();
  if (!dump) return map;
  for (const line of String(dump).split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (name === 'set-cookie') map.set(name, (map.get(name) || '') + (map.has(name) ? '\n' : '') + value);
    else map.set(name, value);
  }
  return map;
}

function makeFetcher() {
  const jar = new Map();
  return async function soraFetch(url, headers, method, body) {
    const cleanHeaders = {};
    let hasCookie = false;
    for (const k in (headers || {})) {
      if (FORBIDDEN_HEADERS.has(String(k).toLowerCase())) continue;
      if (String(k).toLowerCase() === 'cookie') hasCookie = true;
      cleanHeaders[k] = headers[k];
    }
    if (jar.size && !hasCookie) {
      const parts = [];
      for (const [name, value] of jar) parts.push(name + '=' + value);
      cleanHeaders['Cookie'] = parts.join('; ');
    }
    const resp = await httpRequest(url, { method: method || 'GET', headers: cleanHeaders, body });
    if (resp.headers && resp.headers.get) {
      const setCookies = resp.headers.get('set-cookie');
      if (setCookies) {
        for (const part of String(setCookies).split('\n')) {
          const kv = part.split(';')[0];
          const eq = kv.indexOf('=');
          if (eq > 0) jar.set(kv.slice(0, eq).trim(), kv.slice(eq + 1).trim());
        }
      }
    }
    const text = resp.text;
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      statusText: '',
      url: resp.finalUrl || url,
      headers: resp.headers || new Map(),
      text: async () => text,
      json: async () => {
        try { return JSON.parse(text); }
        catch (e) { throw new Error('JSON invalid from ' + url + ': ' + e.message); }
      }
    };
  };
}

let curlPath = null;
function resolveCurl(cb) {
  if (curlPath !== null) return cb(curlPath);
  execFile('curl', ['--version'], { timeout: 5000 }, (err) => {
    curlPath = err ? '' : 'curl';
    if (err) execFile('curl.exe', ['--version'], { timeout: 5000 }, (err2) => {
      if (!err2) curlPath = 'curl.exe';
      cb(curlPath);
    });
    else cb(curlPath);
  });
}

function curlRequest(url, opts) {
  return new Promise((resolve, reject) => {
    resolveCurl((bin) => {
      if (!bin) return reject(new Error('curl not available'));
      const method = opts.method || 'GET';
      const tmp = path.join(os.tmpdir(), 'xdf_hdrs_' + process.pid + '_' + Date.now() + '.txt');
      const args = ['-sS', '--max-time', '30'];
      if (method === 'HEAD') args.push('-I');
      else args.push('-L', '--compressed', '-X', method);
      for (const k in (opts.headers || {})) args.push('-H', k + ': ' + opts.headers[k]);
      if (opts.body != null) args.push('--data-binary', opts.body);
      args.push('-D', tmp, '-w', '\n__XDF_STATUS__%{http_code}');
      args.push(url);
      execFile(bin, args, { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' }, (err, stdout) => {
        let headers = null;
        try { headers = parseHeaderDump(fs.readFileSync(tmp, 'utf8')); } catch (e) { }
        try { fs.unlinkSync(tmp); } catch (e) { }
        if (err) return reject(new Error('curl: ' + (err.message || err)));
        const mark = '\n__XDF_STATUS__';
        const idx = stdout.lastIndexOf(mark);
        const status = idx >= 0 ? parseInt(stdout.slice(idx + mark.length).trim(), 10) : 0;
        const text = idx >= 0 ? stdout.slice(0, idx) : stdout;
        resolve({ ok: status >= 200 && status < 300, status, text, headers });
      });
    });
  });
}

async function httpRequest(url, opts) {
  if (curlPath !== '') {
    try { return await curlRequest(url, opts); } catch (e) { }
  }
  const fetchOpts = { method: opts.method || 'GET', headers: {}, redirect: 'follow' };
  for (const k in (opts.headers || {})) fetchOpts.headers[k] = opts.headers[k];
  if (opts.body != null) fetchOpts.body = opts.body;
  const resp = await fetch(url, fetchOpts);
  return { ok: resp.ok, status: resp.status, text: await resp.text(), finalUrl: resp.url, headers: resp.headers };
}

function loadModule(src) {
  const fetcher = makeFetcher();
  const sandboxConsole = { log: (...a) => console.log('[mod]', ...a), error: (...a) => console.error('[mod-err]', ...a), warn: () => { } };
  const factory = new Function(
    'fetch', 'fetchv2', 'window', 'console', 'location',
    src + '\n;return {' +
    'searchResults: typeof searchResults !== "undefined" ? searchResults : null,' +
    'extractDetails: typeof extractDetails !== "undefined" ? extractDetails : null,' +
    'extractEpisodes: typeof extractEpisodes !== "undefined" ? extractEpisodes : null,' +
    'extractStreamUrl: typeof extractStreamUrl !== "undefined" ? extractStreamUrl : null,' +
    'extractChapters: typeof extractChapters !== "undefined" ? extractChapters : null,' +
    'extractText: typeof extractText !== "undefined" ? extractText : null,' +
    'extractImages: typeof extractImages !== "undefined" ? extractImages : null' +
    '};'
  );
  return factory(fetcher, fetcher, { fetch: fetcher, fetchv2: fetcher }, sandboxConsole, undefined);
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : [parsed]; }
  if (value && typeof value === 'object') return [value];
  return [];
}
function normalizeStreams(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') { try { return normalizeStreams(JSON.parse(value)); } catch (e) { return []; } }
  if (value && typeof value === 'object') {
    if (Array.isArray(value.streams)) return value.streams;
    if (value.streamUrl || value.url) return [value];
    return [value];
  }
  return [];
}
function errText(e) { const msg = e && e.message ? e.message : String(e); return msg.slice(0, 300); }
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout ' + ms + 'ms in ' + label)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

(async () => {
  const mod = loadModule(src);
  if (type === 'auto') {
    type = (typeof mod.extractText === 'function' && typeof mod.extractImages === 'function') ? 'manga-novel'
      : typeof mod.extractText === 'function' ? 'novel'
      : (typeof mod.extractImages === 'function' && typeof mod.extractStreamUrl !== 'function') ? 'manga' : 'video';
  }
  console.log('== localtest', scriptPath, 'type=' + type, 'kw=' + keyword);
  let results = [];
  try {
    const raw = await withTimeout(mod.searchResults(keyword), 25000, 'search');
    results = normalizeArray(raw);
    console.log('SEARCH ok count=' + results.length);
    results.slice(0, 5).forEach(r => console.log('  -', (r.title || r.name || '').slice(0, 60), '|', (r.href || r.id || '').slice(0, 90), '|', (r.image || r.imageURL || '').slice(0, 60)));
  } catch (e) { console.log('SEARCH ERR: ' + errText(e)); return; }

  const first = results[0];
  const itemKey = first ? (first.href || first.id) : null;
  if (!first || !itemKey) { console.log('no results'); return; }

  try {
    const d = normalizeArray(await withTimeout(mod.extractDetails(itemKey), 25000, 'details'))[0] || {};
    console.log('DETAILS ok | desc=' + String(d.description || '').slice(0, 80).replace(/\n/g, ' '));
  } catch (e) { console.log('DETAILS ERR: ' + errText(e)); }

  if (type === 'novel') {
    let chapters = [];
    try {
      chapters = normalizeArray(await withTimeout(mod.extractChapters(first.href), 25000, 'chapters'));
      console.log('CHAPTERS ok count=' + chapters.length);
      chapters.slice(0, 3).forEach(c => console.log('  -', String(c.title || '').slice(0, 50), '|', String(c.href || '').slice(0, 90)));
    } catch (e) { console.log('CHAPTERS ERR: ' + errText(e)); return; }
    const chUrl = (chapters[0] && chapters[0].href) || first.href;
    try {
      const html = String(await withTimeout(mod.extractText(chUrl), 40000, 'text') || '');
      const ok = html.length > 0 && !/^(<p>Error|<p>Nessun|no content|error)/i.test(html);
      console.log('TEXT ok=' + ok + ' len=' + html.length + ' imgs=' + (html.match(/<img/g) || []).length + ' | ' + html.slice(0, 150).replace(/\s+/g, ' '));
    } catch (e) { console.log('TEXT ERR: ' + errText(e)); }
    return;
  }

  if (type === 'manga') {
    let chapterKeys = [];
    try {
      const rawCh = await withTimeout(mod.extractChapters(itemKey), 25000, 'chapters');
      const map = typeof rawCh === 'string' ? JSON.parse(rawCh) : (rawCh || {});
      for (const lang in map) {
        const groups = map[lang];
        if (!Array.isArray(groups)) continue;
        for (const g of groups) {
          const items = Array.isArray(g) ? g[1] : g;
          if (Array.isArray(items)) for (const it of items) if (it && it.id) chapterKeys.push(it.id);
        }
      }
      console.log('CHAPTERS ok count=' + chapterKeys.length);
    } catch (e) { console.log('CHAPTERS ERR: ' + errText(e)); return; }
    const candidates = [chapterKeys[0], chapterKeys[Math.floor(chapterKeys.length / 2)], chapterKeys[chapterKeys.length - 1]]
      .filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 3);
    let imgs = [];
    for (const chapterId of candidates) {
      try {
        const rawImgs = await withTimeout(mod.extractImages(chapterId), 40000, 'images');
        imgs = Array.isArray(rawImgs) ? rawImgs : (typeof rawImgs === 'string' ? JSON.parse(rawImgs) : []);
        if (imgs.length) break;
      } catch (e) { console.log('IMAGES ERR(chapter ' + chapterId + '): ' + errText(e)); imgs = []; }
    }
    console.log('IMAGES count=' + imgs.length + ' sample=' + String(imgs[0] || '').slice(0, 100));
    return;
  }

  let episodes = [];
  try {
    episodes = normalizeArray(await withTimeout(mod.extractEpisodes(first.href), 25000, 'episodes'));
    console.log('EPISODES ok count=' + episodes.length);
    episodes.slice(0, 5).forEach(ep => console.log('  - ep', typeof ep === 'object' ? ep.number : ep, '|', typeof ep === 'object' ? String(ep.href || '').slice(0, 90) : ''));
  } catch (e) { console.log('EPISODES ERR: ' + errText(e)); }

  const ep = episodes[0];
  const streamSource = (ep && typeof ep === 'object' && ep.href) ? ep.href : first.href;
  try {
    const arr = normalizeStreams(await withTimeout(mod.extractStreamUrl(streamSource), 40000, 'stream'));
    console.log('STREAM ok count=' + arr.length);
    arr.slice(0, 8).forEach(s => console.log('  -', (s.quality || s.title || '?'), '|', String(s.url || s.streamUrl || '').slice(0, 110)));
    if (arr.length && arr[0].subtitles) console.log('  subtitles:', JSON.stringify(arr[0].subtitles).slice(0, 150));
  } catch (e) { console.log('STREAM ERR: ' + errText(e)); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
