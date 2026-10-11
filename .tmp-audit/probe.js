// Probe a module's full pipeline: node probe.js <module.js> <keyword> [detailLabel]
const fs = require('fs');
const vm = require('vm');
const path = process.argv[2];
const kw = process.argv[3] || 'one piece';
const say = (...a) => process.stdout.write(a.join(' ') + '\n');
global.fetchv2 = (u, h, m, b) => fetch(u, { method: m || 'GET', headers: h || {}, body: b }).then(async r => ({ ok: r.ok, status: r.status, text: async () => await r.text(), json: async () => JSON.parse(await r.text()) }));
global.fetch = global.fetchv2;
const logs = [];
global.console = { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push('ERR ' + a.join(' ')), warn: () => { } };
let src = fs.readFileSync(path, 'utf8');
const ctx = { fetch: global.fetchv2, fetchv2: global.fetchv2, console: global.console, module: {}, require, process, atob: (s) => Buffer.from(s, 'base64').toString('binary') };
vm.createContext(ctx);
const w = '(function(){\n' + src + '\nreturn {searchResults:typeof searchResults!=="undefined"?searchResults:null,extractDetails:typeof extractDetails!=="undefined"?extractDetails:null,extractEpisodes:typeof extractEpisodes!=="undefined"?extractEpisodes:null,extractStreamUrl:typeof extractStreamUrl!=="undefined"?extractStreamUrl:null,extractChapters:typeof extractChapters!=="undefined"?extractChapters:null,extractText:typeof extractText!=="undefined"?extractText:null,extractImages:typeof extractImages!=="undefined"?extractImages:null};\n})()';
const m = vm.runInContext(w, ctx, { filename: path });
function norm(v) { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [p]; } catch { return []; } } return (v && typeof v === 'object') ? [v] : []; }
(async () => {
  try {
    const s = norm(await m.searchResults(kw));
say('SEARCH n=' + s.length, (s[0] || {}).title, '|', (s[0] || {}).href || (s[0] || {}).id);
    if (!s.length || !((s[0]).href || (s[0]).id)) { say('stop: no item key'); dumpLogs(); return; }
    const item = s[0].href || s[0].id;
    try {
      const d = norm(await m.extractDetails(item))[0] || {};
say('DETAILS desc=' + String(d.description || '').slice(0, 60));
    } catch (e) { say('DETAILS ERR', e.message); }
    if (m.extractChapters && m.extractImages) {
      const ch = await m.extractChapters(item);
      say('CHAPTERS:', typeof ch, String(ch).slice(0, 80));
      dumpLogs(); return;
    }
    if (m.extractChapters && !m.extractStreamUrl) {
      const ch = norm(await m.extractChapters(item));
      say('CHAPTERS n=' + ch.length, ch.slice(0, 3).map(c => c.title || c));
      dumpLogs(); return;
    }
    const eps = m.extractEpisodes ? norm(await m.extractEpisodes(item)) : [];
    say('EPISODES n=' + eps.length, eps.slice(0, 3).map(e => e.number + ':' + String(e.href || '').slice(0, 60)));
    const src2 = (eps[0] && eps[0].href) ? eps[0].href : item;
    if (m.extractStreamUrl) {
      const st = await m.extractStreamUrl(src2);
      say('STREAM type=' + typeof st, 'val=' + String(st).slice(0, 200));
    }
    dumpLogs();
  } catch (e) { say('FATAL', e.message); dumpLogs(); }
  function dumpLogs() { if (logs.length) say('--- module logs ---'); logs.slice(0, 12).forEach(l => say('  ' + l.slice(0, 140))); }
})().catch(e => say('OUTER ERR', e.message));
