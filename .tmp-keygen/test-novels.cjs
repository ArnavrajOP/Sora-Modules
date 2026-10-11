// Local contract test for allmanga-novels.js (mangas type — raw objects, extractImages)
const out = (s) => process.stdout.write(s + '\n');
global.fetchv2 = (u, h, m, b) => fetch(u, { method: m || 'GET', headers: h, body: b });

const fs = require('fs');
const src = fs.readFileSync('D:/xdfkenny-sora-modules/allmanga-novels/allmanga-novels.js', 'utf8');
const mod = new Function(src + '\nreturn {searchResults, extractDetails, extractChapters, extractImages};')();

(async () => {
  out('--- search ---');
  const sr = await mod.searchResults('solo leveling');
  out('results: ' + (Array.isArray(sr) ? sr.length : typeof sr) + ' first: ' + (sr[0] && (sr[0].title || sr[0].name)));
  if (!Array.isArray(sr) || !sr.length) process.exit(1);

  out('--- details ---');
  const url = sr[0].id || sr[0].href;
  const det = await mod.extractDetails(url);
  out('desc: ' + String((det && (det.description || det[0] && det[0].description)) || '').slice(0, 80));

  out('--- chapters ---');
  const chs = await mod.extractChapters(url);
  out('chapters: ' + chs.length + ' first: ' + JSON.stringify(chs[0]).slice(0, 140));
  if (!chs.length) process.exit(1);

  out('--- images ---');
  const imgs = await mod.extractImages(chs[0].href || chs[0].url || chs[0].id);
  const n = Array.isArray(imgs) ? imgs.length : -1;
  out('images: ' + n + ' first: ' + (n > 0 ? String(imgs[0].url || imgs[0].imgURL || imgs[0]).slice(0, 100) : JSON.stringify(imgs).slice(0, 200)));
  process.exit(n > 0 ? 0 : 1);
})().catch(e => { out('FAIL: ' + (e && e.stack || e)); process.exit(1); });
