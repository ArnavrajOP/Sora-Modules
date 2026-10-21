/* Confirm whether ShizaProject's base One Piece release (one-piece-tv) is stocked. */
'use strict';
const SITE = 'https://shiza-project.com';
async function gq(query, variables) {
  const r = await fetch(SITE + '/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', 'Origin': SITE, 'Referer': SITE + '/' },
    body: JSON.stringify({ variables, query }),
  });
  return r.json();
}
(async () => {
  for (const slug of ['one-piece-tv', 'one-piece-tv-1']) {
    const j = await gq('query q($slug:String!){ release(slug:$slug){ episodesCount episodesAired episodes{ number videos{ id embedUrl } } } }', { slug });
    const rel = j.data && j.data.release;
    if (!rel) { console.log(slug, '→ no release', (j.errors || [''])[0]); continue; }
    const eps = rel.episodes || [];
    const wv = eps.filter(e => e.videos && e.videos.length && e.videos.some(v => v.embedUrl));
    const nums = eps.map(e => e.number);
    console.log(slug, '→ returned', eps.length, 'range', Math.min(...nums), '-', Math.max(...nums), 'aird', rel.episodesAired, 'withEmbeds', wv.length);
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
