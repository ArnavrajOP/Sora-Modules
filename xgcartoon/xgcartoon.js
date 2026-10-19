const XG_BASE = 'https://www.xgcartoon.com';
const XG_CDN = 'https://xgct-video.bzcdn.net';
const XG_BUILD = '1.0.0';
if (typeof console !== 'undefined') console.log('[XgCartoon] module script loaded v' + XG_BUILD + ' — 西瓜卡通 (xgcartoon.com)');

function xgFetch(url, options) {
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

async function xgGet(url) {
    let res = await xgFetch(url);
    let text = '';
    if (res && typeof res.text === 'function') {
        try {
            const p = res.text();
            text = p && typeof p.then === 'function' ? await p : p;
        } catch (e) { text = ''; }
    }
    for (let i = 0; i < 2 && (!text || text.length < 2000); i++) {
        res = await xgFetch(url);
        text = '';
        if (res && typeof res.text === 'function') {
            try {
                const p = res.text();
                text = p && typeof p.then === 'function' ? await p : p;
            } catch (e) { text = ''; }
        }
    }
    return text || '';
}

function xgClean(s) {
    if (!s) return '';
    return String(s)
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function xgSlugFromUrl(url) {
    const m = String(url || '').match(/\/detail\/([a-z0-9_\-]+)/i);
    if (m) return m[1];
    const m2 = String(url || '').match(/cartoon_id=([a-z0-9_\-]+)/i);
    return m2 ? m2[1] : '';
}

function xgChapterFromUrl(url) {
    const u = String(url || '');
    const m = u.match(/\/video\/[a-z0-9_\-]+\/([a-z0-9_\-]+?)(?:\.html)?$/i);
    if (m) return m[1];
    const m2 = u.match(/chapter_id=([a-z0-9_\-]+)/i);
    return m2 ? m2[1] : '';
}

/* MAIN FUNCTIONS */

async function searchResults(keyword) {
    try {
        const query = (keyword || '').trim();
        if (!query) return JSON.stringify([]);
        const html = await xgGet(XG_BASE + '/search?q=' + encodeURIComponent(query));
        const results = [];
        const seen = {};
        // card: <a href="/detail/SLUG" ... class="topic-list-item">...amp-img cover + .h3 title...</a>
        const re = /<a[^>]*href="\/detail\/([a-z0-9_\-]+)"[^>]*class="topic-list-item"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const slug = m[1];
            const body = m[2];
            const t = body.match(/class="h3[^"]*"[^>]*>([\s\S]{0,200}?)<\/div>/i);
            const title = xgClean(t ? t[1] : '');
            if (!title || seen[slug]) continue;
            seen[slug] = true;
            results.push({
                title: title,
                image: 'https://static-a.xgcartoon.com/cover/' + slug + '.jpg',
                href: XG_BASE + '/detail/' + slug + '?language=tw'
            });
        }
        return JSON.stringify(results);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[XgCartoon] search error: ' + e);
        return JSON.stringify([]);
    }
}

async function extractDetails(url) {
    try {
        const slug = xgSlugFromUrl(url);
        if (!slug) return JSON.stringify([{ description: 'No description available', aliases: 'N/A', airdate: 'Unknown' }]);
        const html = await xgGet(XG_BASE + '/detail/' + slug + '?language=tw');
        let title = '';
        const h = html.match(/<h1[^>]*>([\s\S]{0,200}?)<\/h1>/i);
        if (h) title = xgClean(h[1]);
        // synopsis: first <p> after the 簡介 heading
        let description = 'No description available';
        const i = html.indexOf('簡介</div>');
        if (i !== -1) {
            const seg = html.substring(i, i + 3000);
            const p = seg.match(/<p[^>]*>([\s\S]{0,3000}?)<\/p>/i);
            if (p) description = xgClean(p[1]) || description;
        }
        let airdate = 'Unknown';
        const j = html.indexOf('更新時間</div>');
        if (j !== -1) {
            const seg = html.substring(j, j + 200);
            const s = seg.match(/<span[^>]*>([^<]+)<\/span>/i);
            if (s) airdate = xgClean(s[1]);
        }
        let aliases = '';
        const parts = [];
        const tagRe = /class="tag[^"]*"[^>]*>\s*([^<]{1,30}?)\s*<\/div>/g;
        let tm;
        while ((tm = tagRe.exec(html)) !== null && parts.length < 5) {
            const t = xgClean(tm[1]);
            if (t && parts.indexOf(t) === -1) parts.push(t);
        }
        aliases = parts.join(', ');
        const author = html.match(/class="topic-list-item--author[^"]*"[^>]*>\s*([^<]{0,80})/i) ||
            html.match(/class="detail-info__author[^"]*"[^>]*>\s*([^<]{0,80})/i);
        if (author && xgClean(author[1])) aliases = xgClean(author[1]) + (aliases ? ' · ' + aliases : '');
        return JSON.stringify([{
            description: (title ? title + '\n' : '') + description,
            aliases: aliases || 'N/A',
            airdate: airdate
        }]);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[XgCartoon] details error: ' + e);
        return JSON.stringify([{ description: 'No description available', aliases: 'N/A', airdate: 'Unknown' }]);
    }
}

async function extractEpisodes(url) {
    try {
        const slug = xgSlugFromUrl(url);
        if (!slug) return JSON.stringify([]);
        const html = await xgGet(XG_BASE + '/detail/' + slug + '?language=tw');
        const episodes = [];
        const seen = {};
        // chapter rows: /user/page_direct?cartoon_id=SLUG&chapter_id=CHID (amp-escaped &)
        const re = new RegExp('/user/page_direct\\?cartoon_id=' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '&amp;chapter_id=([a-z0-9_\\-]+)', 'gi');
        let m;
        let n = 1;
        while ((m = re.exec(html)) !== null) {
            const chid = m[1];
            if (seen[chid]) continue;
            seen[chid] = true;
            // canonical video URL (200-verified) — the /user/page_direct link 302-redirects to it
            episodes.push({
                href: XG_BASE + '/video/' + slug + '/' + chid + '.html',
                number: n++
            });
        }
        return JSON.stringify(episodes);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[XgCartoon] episodes error: ' + e);
        return JSON.stringify([]);
    }
}

function xgIsM3u8(text) {
    if (!text) return false;
    const head = text.substring(0, 300);
    return head.indexOf('#EXTM3U') !== -1 || head.indexOf('#EXTINF') !== -1;
}

async function extractStreamUrl(url) {
    try {
        const empty = { streams: [] };
        const chid = xgChapterFromUrl(url);
        if (!chid) return JSON.stringify(empty);
        const res = await xgGet(XG_BASE + '/user/amp/content_pframe_url?chapter_id=' + chid + '&level=high&expires=3600');
        let data = null;
        try { data = JSON.parse(res); } catch (e) { data = null; }
        let frame = (data && data.data) ? String(data.data) : '';
        if (!frame) frame = res;
        const vm = frame.match(/vid=([0-9a-fA-F\-]{36})/);
        if (!vm) return JSON.stringify(empty);
        const vid = vm[1];
        const hi = XG_CDN + '/' + vid + '/1920x1080/video.m3u8';
        const master = XG_CDN + '/' + vid + '/playlist.m3u8';
        const probe = await xgGet(hi);
        if (xgIsM3u8(probe)) {
            if (typeof console !== 'undefined') console.log('[XgCartoon] stream resolved: ' + hi);
            return JSON.stringify({
                streams: [
                    { title: '1080p', streamUrl: hi },
                    { title: 'multi-quality', streamUrl: master }
                ]
            });
        }
        const probeM = await xgGet(master);
        if (xgIsM3u8(probeM)) {
            if (typeof console !== 'undefined') console.log('[XgCartoon] stream resolved (master): ' + master);
            return JSON.stringify({ streams: [{ title: 'high', streamUrl: master }] });
        }
        return JSON.stringify(empty);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[XgCartoon] stream error: ' + e);
        return JSON.stringify({ streams: [] });
    }
}
