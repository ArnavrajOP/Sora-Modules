/* Annotate modules.json with the 2026-10-20 resolver-family + flaky records. */
'use strict';
const fs = require('fs');
const f = 'modules.json';
const idx = JSON.parse(fs.readFileSync(f, 'utf8'));

const resolver = ['topcinema', 'uaserial', 'animesrbija', 'animexin', 'gidonline', 'animedefenders', 'doramaland', 'filmpalast', 'turkish123'];
const note = '2026-10-20 audit: base site answers 200 but the module third-party stream resolvers return 0 usable streams (empty extractStreamUrl). Distinct resolver families (filemoon/streamwish/streamtape/vidhide/dailymotion etc.), no shared host - needs a per-module resolver rework to a live backend, not a quick fix.';
let n = 0;
for (const id of resolver) {
  const e = idx.modules.find(x => x.id === id); if (!e) continue;
  e.needs_review = true;
  if (!e.note || !e.note.includes('2026-10-20')) e.note = note;
  e.updated = '2026-10-20'; n++;
}
const at = idx.modules.find(x => x.id === 'anitube');
if (at) {
  at.needs_review = true;
  at.updated = '2026-10-20';
  at.note = '2026-10-20 audit: episode list is flaky (eps=0 on sweep, 1 on re-probe) and the CDN/Dailymotion stream step resolves intermittently - upstream-availability wall, like anidub. Re-test on a clean connection.';
  n++;
}
fs.writeFileSync(f, JSON.stringify(idx, null, 2) + '\n');
console.log('annotated', n, 'entries');
