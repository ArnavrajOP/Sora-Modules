/* Dump the actual videos object for a release known to have videos (frieren). */
'use strict';
const SITE = 'https://shiza-project.com';
async function gq(query, variables, op) {
  const r = await fetch(SITE + '/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', 'Origin': SITE, 'Referer': SITE + '/' },
    body: JSON.stringify({ operationName: op || 'q', variables: variables || {}, query }),
  });
  return r.json();
}
(async () => {
  const q = 'query q($slug:String!){ release(slug:$slug){ episodes{ number videos{ id __typename embedUrl } } } }';
  const j = await gq(q, { slug: 'sousou-no-frieren-tv' });
  const rel = j.data && j.data.release;
  const withVid = (rel.episodes || []).filter(e => e.videos && e.videos.length);
  console.log('errors:', j.errors || 'none');
  console.log('frieren eps with vid:', withVid.length, 'of', (rel.episodes || []).length);
  console.log('ep1 videos:', JSON.stringify(withVid[0] ? withVid[0].videos : null, null, 1).slice(0, 800));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
