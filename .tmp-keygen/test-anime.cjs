// Local contract test for allmanga.js (anime) with fetchv2 shim
const out = (s) => process.stdout.write(s + '\n');
global.fetchv2 = (u, h, m, b) => fetch(u, { method: m || 'GET', headers: h, body: b });

const fs = require('fs');
const src = fs.readFileSync('D:/xdfkenny-sora-modules/allmanga/allmanga.js', 'utf8');
const mod = new Function(src + '\nreturn {searchResults, extractDetails, extractEpisodes, extractStreamUrl};')();

(async () => {
  out('--- search ---');
  const sr = JSON.parse(await mod.searchResults('frieren'));
  out('results: ' + sr.length + ' first: ' + (sr[0] && sr[0].title + ' | ' + sr[0].href));
  if (!sr.length) process.exit(1);

  out('--- details ---');
  const det = JSON.parse(await mod.extractDetails(sr[0].href));
  out('desc: ' + String(det[0] && det[0].description).slice(0, 80));

  out('--- episodes ---');
  const eps = JSON.parse(await mod.extractEpisodes(sr[0].href));
  out('episodes: ' + eps.length + ' first: ' + JSON.stringify(eps[0]));
  if (!eps.length) process.exit(1);

  out('--- stream ---');
  const st = JSON.parse(await mod.extractStreamUrl(eps[Math.min(eps.length - 1, 2)].href));
  const streams = st.streams || st;
  out('streams: ' + (Array.isArray(streams) ? streams.length : 'n/a'));
  if (Array.isArray(streams)) {
    for (const s of streams.slice(0, 4)) out('  ' + (s.title || s.quality) + ' -> ' + String(s.streamUrl || s.url).slice(0, 90));
  }
  process.exit(0);
})().catch(e => { out('FAIL: ' + (e && e.stack || e)); process.exit(1); });
