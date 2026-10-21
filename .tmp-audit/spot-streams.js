/* Spot-check: curl the latest emitted streamFirst URLs, no Referer. */
'use strict';
const fs = require('fs');
const lines = fs.readFileSync(__dirname + '/audit-results.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));
const pick = lines.filter(l => ['AnimeUnity', 'StreamingUnity'].includes(l.id));
(async () => {
  for (const p of pick) {
    const u = p.streamFirst;
    if (!u) { console.log(p.id, 'no streamFirst'); continue; }
    try {
      const r = await fetch(u);
      const t = await r.text();
      console.log(p.id, r.status, (r.headers.get('content-type') || ''), 'playlist:', /^#EXTM3U/.test(t));
    } catch (e) {
      console.log(p.id, 'ERR', e.message);
    }
  }
})();
