// Build the episode query URL with a valid aaReq token (live bootstrap, current epoch) and print it for curl/browser testing
const out = (s) => process.stdout.write(s + '\n');
global.fetchv2 = (u, h, m, b) => fetch(u, { method: m || 'GET', headers: h, body: b });
const fs = require('fs');
const src = fs.readFileSync('D:/xdfkenny-sora-modules/allmanga/allmanga.js', 'utf8');
const mod = new Function(src + '\nreturn {aaSha256, aaAscii, aaHex, aaBuildToken, aaGetKeys, EPISODE_QUERY};')();
(async () => {
  const keys = await mod.aaGetKeys();
  out('keys: ' + JSON.stringify({ build: keys.build_id, epoch: keys.epoch, lane: keys.lane, key: keys.key ? keys.key.slice(0, 16) + '…' : null }));
  const qh = mod.aaHex(mod.aaSha256(mod.aaAscii(mod.EPISODE_QUERY)));
  const ts = Math.floor(Date.now() / 300000) * 300000;
  const variables = { showId: 'y6CkLkj4e9Trc9zDu', translationType: 'sub', episodeString: '1' };
  const extensions = { persistedQuery: { version: 1, sha256Hash: qh }, aaReq: mod.aaBuildToken(keys, qh, ts), k: keys.lane };
  out('https://api.mkissa.net/api?variables=' + encodeURIComponent(JSON.stringify(variables)) + '&extensions=' + encodeURIComponent(JSON.stringify(extensions)));
})().catch(e => { out('FATAL ' + e.message); process.exit(1); });
