// Build the episode query URL with a valid aaReq token and print it for curl testing
const out = (s) => process.stdout.write(s + '\n');
global.fetchv2 = (u, h, m, b) => fetch(u, { method: m || 'GET', headers: h, body: b });
const fs = require('fs');
const src = fs.readFileSync('D:/xdfkenny-sora-modules/allmanga/allmanga.js', 'utf8');
const mod = new Function(src + '\nreturn {aaSha256, aaAscii, aaHex, aaBuildToken, EPISODE_QUERY};')();

const qh = mod.aaHex(mod.aaSha256(mod.aaAscii(mod.EPISODE_QUERY)));
const keys = {
  build_id: '179', epoch: '2962', lane: 'k7',
  key: '93ae3a7ef8e5e1ccbd3da7fa4b9b475c1f87526429f7e355b2b87aed03f9a245',
  static_key: 'Xot36i3lK3:v1'
};
const variables = { showId: 'y6CkLkj4e9Trc9zDu', translationType: 'sub', episodeString: '1' };
const extensions = { persistedQuery: { version: 1, sha256Hash: qh }, aaReq: mod.aaBuildToken(keys, qh, Math.floor(Date.now() / 300000) * 300000), k: 'k7' };
out('https://api.mkissa.net/api?variables=' + encodeURIComponent(JSON.stringify(variables)) + '&extensions=' + encodeURIComponent(JSON.stringify(extensions)));
