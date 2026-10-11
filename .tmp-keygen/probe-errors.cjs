// Compare server error for a VALID token vs a CORRUPT token on the episode endpoint.
const out = (s) => process.stdout.write(s + '\n');
global.fetchv2 = (u, h, m, b) => fetch(u, { method: m || 'GET', headers: h, body: b });
const fs = require('fs');
const src = fs.readFileSync('D:/xdfkenny-sora-modules/allmanga/allmanga.js', 'utf8');
const mod = new Function(src + '\nreturn {aaSha256, aaAscii, aaHex, aaBuildToken, EPISODE_QUERY};')();

async function main() {
  const qh = mod.aaHex(mod.aaSha256(mod.aaAscii(mod.EPISODE_QUERY)));
  const keys = {
    build_id: '179', epoch: '2962', lane: 'k7',
    key: '93ae3a7ef8e5e1ccbd3da7fa4b9b475c1f87526429f7e355b2b87aed03f9a245',
    static_key: 'Xot36i3lK3:v1'
  };
  const variables = { showId: 'y6CkLkj4e9Trc9zDu', translationType: 'sub', episodeString: '1' };
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  async function attempt(label, aaReq) {
    const extensions = { persistedQuery: { version: 1, sha256Hash: qh }, aaReq, k: 'k7' };
    const url = 'https://api.mkissa.net/api?variables=' + encodeURIComponent(JSON.stringify(variables)) +
      '&extensions=' + encodeURIComponent(JSON.stringify(extensions));
    const r = await fetch(url, {
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://mkissa.to/', 'Origin': 'https://mkissa.to', 'User-Agent': UA }
    });
    const t = await r.text();
    out(label + ' -> HTTP ' + r.status + ' ' + t.slice(0, 160));
  }

  await attempt('valid token  ', mod.aaBuildToken(keys, qh, Math.floor(Date.now() / 300000) * 300000));
  await attempt('corrupt token', 'AAAA' + mod.aaBuildToken(keys, qh, Math.floor(Date.now() / 300000) * 300000).slice(4));
  process.exit(0);
}
main().catch(e => { out('ERR ' + e.stack); process.exit(1); });
