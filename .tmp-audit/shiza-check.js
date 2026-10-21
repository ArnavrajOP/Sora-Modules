/* .tmp-audit/shiza-check.js — inspect ShizaProject GraphQL release/video shapes */
'use strict';
const SITE = 'https://shiza-project.com';

async function gq(query, variables, op) {
  const r = await fetch(SITE + '/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      'Origin': SITE,
      'Referer': SITE + '/',
    },
    body: JSON.stringify({ operationName: op || 'q', variables: variables || {}, query }),
  });
  return r.json();
}

(async () => {
  const s = await gq(
    'query s($q:String!){ search(query:$q, type: RELEASE, first: 10){ edges{ node{ ... on Release{ slug name episodesCount status } } } } }',
    { q: 'one piece' }, 's'
  );
  const rels = (s.data?.search?.edges || []).map(e => e.node).filter(Boolean);
  console.log('one piece releases:', rels.map(r => r.slug + ' (' + r.episodesCount + ',' + r.status + ')').join(' | '));

  for (const r of rels.slice(0, 3)) {
    const q = 'query q($slug:String!){ release(slug:$slug){ episodesCount episodesAired episodes{ number videos{ id } } } }';
    const j = await gq(q, { slug: r.slug });
    const eps = (j.data && j.data.release && j.data.release.episodes) || [];
    const wv = eps.filter(e => e.videos && e.videos.length);
    console.log(r.slug, 'returned', eps.length, 'withVid', wv.length,
      wv[0] ? ('first vid: ' + JSON.stringify(wv[0].videos[0]).slice(0, 80)) : '');
  }

  // What do VideoFile nodes expose? (embedUrl vs a separate server resolution)
  const vf = await gq(
    'query v($slug:String!){ release(slug:$slug){ episodes{ number videos{ id embedUrl } } } }',
    { slug: rels[0] ? rels[0].slug : 'one-piece-tv-1' }
  );
  const e0 = ((vf.data && vf.data.release && vf.data.release.episodes) || []).find(e => e.videos && e.videos.length);
  console.log('VideoFile embedUrl sample:', e0 ? JSON.stringify(e0.videos[0]).slice(0, 160) : 'none');
})().catch(e => { console.error('ERR', e); process.exit(1); });
