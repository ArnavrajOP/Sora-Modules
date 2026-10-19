const NUNUJU_BASE = 'https://nunuju.tv';
const NUNUJU_BUILD = '1.0.0';
if (typeof console !== 'undefined') console.log('[Nunuju] module script loaded v' + NUNUJU_BUILD + ' — Chinese dramas/movies (nunuju.tv)');

function njFetch(url, options) {
    options = options || {};
    const headers = options.headers || {};
    if (!headers['User-Agent']) {
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
    if (typeof fetchv2 === 'function') {
        try { return fetchv2(url, headers, options.method || 'GET', options.body || null); } catch (e) {}
    }
    try { return fetch(url, { method: options.method || 'GET', headers: headers, body: options.body || null }); }
    catch (e) { return Promise.resolve(null); }
}

function njText(res) {
    if (!res) return Promise.resolve('');
    if (typeof res.text === 'function') {
        try { const p = res.text(); if (p && typeof p.then === 'function') return p; return Promise.resolve(p); } catch (e) {}
    }
    return Promise.resolve(typeof res === 'string' ? res : '');
}

async function njGet(url) {
    // fetchv2 (or its Node-test fallback) may reject on transient errors /
    // dead CDNs — catch at each attempt and retry a couple of times
    let html = '';
    for (let i = 0; i < 3; i++) {
        try {
            const res = await njFetch(url);
            html = await njText(res);
            if (html && html.length >= 2000) break;
        } catch (e) { html = ''; }
    }
    return html || '';
}

function njUnescape(s) {
    if (!s) return '';
    return String(s).replace(/\\u([0-9a-fA-F]{4})/g, function(_, h) {
        return String.fromCharCode(parseInt(h, 16));
    }).replace(/\\\//g, '/').replace(/\\"/g, '"');
}

function njClean(s) {
    if (!s) return '';
    return String(s)
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function njField(html, label) {
    // label like "年份：" sits inside <em class="hl-text-muted">年份：</em>VALUE
    // where VALUE is plain text or wrapped in <span ...>VALUE</span>
    const idx = html.indexOf(label);
    if (idx === -1) return '';
    const seg = html.substring(idx + label.length, idx + label.length + 220);
    const m = seg.match(/^\s*<\/em>\s*(<span[^>]*>)?([\s\S]{0,200})/);
    if (!m) return '';
    const val = m[2].split('</span>')[0].split('</li>')[0];
    return njClean(val);
}

function njDetailId(url) {
    const m = String(url || '').match(/\/vod\/detail\/id\/(\d+)(?:\.html)?/);
    if (m) return m[1];
    const m2 = String(url || '').match(/\/vod\/play\/id\/(\d+)/);
    return m2 ? m2[1] : '';
}

function njPlayUrl(id, sid, nid) {
    return NUNUJU_BASE + '/vod/play/id/' + id + '/sid/' + sid + '/nid/' + (nid || 1) + '.html';
}

function njSidLinks(html, id) {
    // source tabs on detail/play pages: /vod/play/id/ID/sid/S/nid/1.html
    const re = new RegExp('/vod/play/id/' + id + '/sid/(\\d+)/nid/\\d+\\.html', 'g');
    const sids = [];
    let m;
    while ((m = re.exec(html)) !== null) {
        const s = m[1];
        if (sids.indexOf(s) === -1) sids.push(s);
    }
    return sids;
}

function njPlayerJson(html) {
    // `var player_aaaa = {...}</script>` — JSON object is the only {...} block in
    // the script tag; the lazy match is anchored on the `</script>`/`;` terminator
    // so the nested vod_data object cannot truncate it
    const m = html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})\s*(?:;|<\/script>)/);
    if (!m) return null;
    let d = null;
    try { d = JSON.parse(m[1]); } catch (e) { return null; }
    return d;
}

function njStreamUrlFromPlayer(jsonText) {
    if (!jsonText) return '';
    let m = jsonText.match(/"url":"((?:[^"\\]|\\.)*)"/);
    if (!m) return '';
    let url = njUnescape(m[1]);
    if (!/^(https?:)?\/\//i.test(url)) return ''; // empty or relative junk
    if (url.charAt(0) === '/') url = NUNUJU_BASE + url;
    if (url.indexOf('http://') === 0) url = url.replace('http://', 'https://');
    return url;
}

function njIsM3u8(text) {
    if (!text) return false;
    const head = text.substring(0, 300);
    return head.indexOf('#EXTM3U') !== -1 || head.indexOf('#EXTINF') !== -1;
}

/* MAIN FUNCTIONS */

async function searchResults(keyword) {
    try {
        const query = (keyword || '').trim();
        if (!query) return JSON.stringify([]);
        const html = await njGet(NUNUJU_BASE + '/vod/search/wd/' + encodeURIComponent(query) + '.html');
        const results = [];
        const seen = {};
        // result card: <a class="hl-item-thumb hl-lazy" href="/vod/detail/id/ID.html" title="TITLE" data-original="IMG">
        const re = /<a[^>]*class="hl-item-thumb[^"]*"[^>]*href="\/vod\/detail\/id\/(\d+)\.html"[^>]*title="([^"]*)"[^>]*data-original="([^"]+)"/g;
        let m;
        while ((m = re.exec(html)) !== null) {
            const id = m[1];
            const title = njClean(njUnescape(m[2]));
            const image = njUnescape(m[3]);
            if (!title || seen[id + '|' + title]) continue;
            seen[id + '|' + title] = true;
            results.push({
                title: title,
                image: image,
                href: NUNUJU_BASE + '/vod/detail/id/' + id + '.html'
            });
        }
        return JSON.stringify(results);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[Nunuju] search error: ' + e);
        return JSON.stringify([]);
    }
}

async function extractDetails(url) {
    try {
        const id = njDetailId(url);
        if (!id) return JSON.stringify([{ description: 'No description available', aliases: 'N/A', airdate: 'Unknown' }]);
        const html = await njGet(NUNUJU_BASE + '/vod/detail/id/' + id + '.html');
        const year = njField(html, '年份：');
        const area = njField(html, '地区：');
        const type = njField(html, '类型：');
        const cast = njField(html, '主演：');
        const director = njField(html, '导演：');
        // title + synopsis: detail page h1 is empty; the player JSON on the
        // first play page carries vod_data.vod_name / blurb
        let title = '';
        let synopsis = '';
        const sids = njSidLinks(html, id);
        const playHtml = await njGet(njPlayUrl(id, sids.length ? sids[0] : '1', 1));
        const player = njPlayerJson(playHtml);
        if (player && player.vod_data) {
            title = njClean(njUnescape(player.vod_data.vod_name || ''));
            synopsis = njClean(njUnescape(player.vod_data.vod_blurb || player.vod_data.vod_content || ''));
        }
        if (!title) {
            const t = html.match(/<title>([^<]+?)\s*-/);
            if (t) title = njClean(t[1]);
        }
        const aliases = [director && '导演: ' + director, cast && '主演: ' + cast, type].filter(Boolean).join(' · ');
        return JSON.stringify([{
            description: title ? title + (synopsis ? '\n' + synopsis : '') : 'No description available',
            aliases: aliases || 'N/A',
            airdate: year || 'Unknown'
        }]);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[Nunuju] details error: ' + e);
        return JSON.stringify([{ description: 'No description available', aliases: 'N/A', airdate: 'Unknown' }]);
    }
}

async function extractEpisodes(url) {
    try {
        const id = njDetailId(url);
        if (!id) return JSON.stringify([]);
        const html = await njGet(NUNUJU_BASE + '/vod/detail/id/' + id + '.html');
        let source = html;
        const sids = njSidLinks(html, id);
        // the detail page normally lists every episode link for the active
        // source; when it does not, fetch the play page for the first source
        if (html.indexOf('/vod/play/id/' + id + '/sid/') === -1 && sids.length) {
            source = await njGet(njPlayUrl(id, sids[0], 1)) || html;
        }
        const episodes = [];
        const seen = {};
        const re = new RegExp('/vod/play/id/' + id + '/sid/(\\d+)/nid/(\\d+)\\.html', 'g');
        let m;
        while ((m = re.exec(source)) !== null) {
            const epSid = m[1];
            const nid = m[2];
            const key = epSid + '/' + nid;
            if (seen[key]) continue;
            seen[key] = true;
            episodes.push({
                href: NUNUJU_BASE + '/vod/play/id/' + id + '/sid/' + epSid + '/nid/' + nid + '.html',
                number: parseInt(nid, 10) || (episodes.length + 1)
            });
        }
        episodes.sort(function(a, b) { return a.number - b.number; });
        return JSON.stringify(episodes);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[Nunuju] episodes error: ' + e);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        const id = njDetailId(url);
        const empty = { streams: [] };
        if (!id) return JSON.stringify(empty);
        let targetUrl = String(url || '');
        const sm = targetUrl.match(/\/sid\/(\d+)\/nid\/(\d+)/);
        const startSid = sm ? sm[1] : '1';
        const startNid = sm ? sm[2] : '1';

        // candidate source ids: from the detail page, padded with 1..12,
        // ordered with the requested sid first
        const detHtml = await njGet(NUNUJU_BASE + '/vod/detail/id/' + id + '.html');
        const sids = njSidLinks(detHtml, id);
        const queue = [];
        sids.forEach(function(s) { if (queue.indexOf(s) === -1) queue.push(s); });
        for (let i = 1; i <= 12; i++) {
            const s = String(i);
            if (queue.indexOf(s) === -1) queue.push(s);
        }
        queue.sort(function(a, b) {
            if (a === startSid) return -1;
            if (b === startSid) return 1;
            return parseInt(a, 10) - parseInt(b, 10);
        });

        for (let q = 0; q < queue.length; q++) {
            const sid = queue[q];
            const nid = (sid === startSid) ? startNid : '1';
            const page = await njGet(njPlayUrl(id, sid, nid));
            if (!page) continue;
            const player = njPlayerJson(page);
            const streamUrl = player ? njStreamUrlFromPlayer(JSON.stringify(player)) : '';
            if (!streamUrl) continue;
            // reachability probe: master or media m3u8 (probe may fail on
            // dead CDNs — njText handles null, so no rejection can escape)
            let probe = '';
            try { probe = await njText(await njFetch(streamUrl)); } catch (e) { probe = ''; }
            if (!njIsM3u8(probe)) continue;
            const streams = [];
            const head = probe.substring(0, 600);
            if (head.indexOf('#EXT-X-STREAM-INF') !== -1) {
                // master playlist: resolve the highest-BANDWIDTH variant
                const lines = probe.split('\n');
                let best = { bw: -1, url: '' };
                for (let li = 0; li < lines.length; li++) {
                    if (lines[li].indexOf('#EXT-X-STREAM-INF') === 0) {
                        const bwm = lines[li].match(/BANDWIDTH=(\d+)/);
                        const bw = bwm ? parseInt(bwm[1], 10) : -1;
                        const next = (lines[li + 1] || '').trim().replace(/["']/g, '');
                        if (next && bw > best.bw) best = { bw: bw, url: next };
                    }
                }
                if (best.url) {
                    if (best.url.indexOf('http') === 0) {
                        // absolute
                    } else if (best.url.charAt(0) === '/') {
                        const origin = streamUrl.match(/^https?:\/\/[^\/]+/i);
                        best.url = (origin ? origin[0] : NUNUJU_BASE) + best.url;
                    } else {
                        best.url = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1) + best.url;
                    }
                    streams.push({ title: 'high', streamUrl: best.url });
                }
                streams.push({ title: 'multi-quality', streamUrl: streamUrl });
            } else {
                streams.push({ title: 'high', streamUrl: streamUrl });
            }
            if (typeof console !== 'undefined') console.log('[Nunuju] stream resolved via sid ' + sid + ': ' + streamUrl);
            return JSON.stringify({ streams: streams });
        }
        return JSON.stringify(empty);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[Nunuju] stream error: ' + e);
        return JSON.stringify({ streams: [] });
    }
}
