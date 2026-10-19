const MBS_BASE = 'https://myselfbbs.com';
const MBS_BUILD = '1.0.0';
if (typeof console !== 'undefined') console.log('[MyselfBBS] module script loaded v' + MBS_BUILD + ' — Japanese/Chinese anime (myselfbbs.com)');

function mbsFetch(url, options) {
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

async function mbsGet(url, referer) {
    const headers = {};
    if (referer) headers['Referer'] = referer;
    let res = await mbsFetch(url, { headers: headers });
    let html = await (res && res.text ? res.text() : Promise.resolve(String(res || '')));
    for (let i = 0; i < 2 && (!html || html.length < 2000); i++) {
        res = await mbsFetch(url, { headers: headers });
        html = await (res && res.text ? res.text() : Promise.resolve(''));
    }
    return html || '';
}

function mbsClean(s) {
    if (!s) return '';
    return String(s)
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

function mbsVodId(url) {
    const m = String(url || '').match(/\/vod\/(\d+)\.html/);
    if (m) return m[1];
    const m2 = String(url || '').match(/myself_plays\/(\d+)/);
    return m2 ? m2[1] : '';
}

/* MAIN FUNCTIONS */

async function searchResults(keyword) {
    try {
        const query = (keyword || '').trim();
        if (!query) return JSON.stringify([]);
        const html = await mbsGet(MBS_BASE + '/search?q=' + encodeURIComponent(query));
        const results = [];
        const seen = {};
        const re = /<li class="col-lg-2 col-md-3 col-4 mb-2">[\s\S]*?<a href="\/vod\/(\d+)\.html"[\s\S]*?alt="([^"]+)"/g;
        let m;
        while ((m = re.exec(html)) !== null) {
            const id = m[1];
            const title = mbsClean(m[2]);
            if (!title || seen[id]) continue;
            seen[id] = true;
            results.push({
                title: title,
                image: MBS_BASE + '/pic_s/' + id + '.jpg',
                href: MBS_BASE + '/vod/' + id + '.html'
            });
        }
        return JSON.stringify(results);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[MyselfBBS] search error: ' + e);
        return JSON.stringify([]);
    }
}

function mbsField(html, label) {
    const idx = html.indexOf(label);
    if (idx === -1) return '';
    const seg = html.substring(idx + label.length, idx + label.length + 120);
    const m = seg.match(/^<\/span>:\s*([^\n<]*)/);
    return m ? mbsClean(m[1]) : mbsClean(seg.split('</li>')[0]);
}

async function extractDetails(url) {
    try {
        const id = mbsVodId(url);
        if (!id) return JSON.stringify([{ description: 'No description available', aliases: 'N/A', airdate: 'Unknown' }]);
        const html = await mbsGet(MBS_BASE + '/vod/' + id + '.html');
        let title = '';
        const t = html.match(/<h1[^>]*>([\s\S]{0,120}?)<\/h1>/i);
        if (t) title = mbsClean(t[1]);
        if (!title) {
            const tt = html.match(/<title>([^<]+?)\s*-\s*Myself/i);
            if (tt) title = mbsClean(tt[1]);
        }
        let description = '';
        const d = html.match(/<div class="desc"[^>]*>([\s\S]*?)<\/div>/i);
        if (d) description = mbsClean(d[1]);
        if (!description) {
            const idx = html.indexOf('劇情簡介');
            if (idx !== -1) description = mbsClean(html.substring(idx + 4, idx + 1600).split('</div>')[0].split('<li>')[0]);
        }
        const airdate = mbsField(html, '首播日期');
        const type = mbsField(html, '作品類型');
        const author = mbsField(html, '原著作者');
        const aliases = [type && '類型: ' + type, author && '原著: ' + author].filter(Boolean).join(' · ');
        return JSON.stringify([{
            description: (title ? title + '\n' : '') + (description || 'No description available'),
            aliases: aliases || 'N/A',
            airdate: airdate || 'Unknown'
        }]);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[MyselfBBS] details error: ' + e);
        return JSON.stringify([{ description: 'No description available', aliases: 'N/A', airdate: 'Unknown' }]);
    }
}

function mbsSlugs(html) {
    const slugs = [];
    const re = /ep_slug="([^"]+)"/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        if (slugs.indexOf(m[1]) === -1) slugs.push(m[1]);
    }
    return slugs;
}

async function extractEpisodes(url) {
    try {
        const id = mbsVodId(url);
        if (!id) return JSON.stringify([]);
        const html = await mbsGet(MBS_BASE + '/vod/' + id + '.html');
        let slugs = mbsSlugs(html);
        // page lists newest first — reverse to chronological order
        slugs = slugs.slice().reverse();
        const episodes = [];
        for (let i = 0; i < slugs.length; i++) {
            episodes.push({
                href: MBS_BASE + '/myself_plays/' + id + '/' + slugs[i],
                number: i + 1
            });
        }
        return JSON.stringify(episodes);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[MyselfBBS] episodes error: ' + e);
        return JSON.stringify([]);
    }
}

function mbsIsM3u8(text) {
    if (!text) return false;
    const head = text.substring(0, 300);
    return head.indexOf('#EXTM3U') !== -1 || head.indexOf('#EXTINF') !== -1;
}

async function extractStreamUrl(url) {
    try {
        const empty = { streams: [] };
        const epUrl = String(url || '');
        const pm = epUrl.match(/myself_plays\/(\d+)\/([^\/]+?)(?:\.json)?(?:#|$)/);
        if (!pm) return JSON.stringify(empty);
        const id = pm[1];
        const slug = pm[2];
        const res = await mbsGet(MBS_BASE + '/myself_plays/' + id + '/' + slug, MBS_BASE + '/vod/' + id + '.html');
        let data = null;
        try { data = JSON.parse(res); } catch (e) { data = null; }
        if (!data || !data.video_plays || !data.video_plays.length) return JSON.stringify(empty);
        // probe each source until one answers with a real playlist
        for (let i = 0; i < data.video_plays.length; i++) {
            const play = data.video_plays[i];
            const streamUrl = String(play.play_data || '');
            if (streamUrl.indexOf('http') !== 0) continue;
            const probe = await mbsGet(streamUrl);
            if (!mbsIsM3u8(probe)) continue;
            const streams = [];
            const head = probe.substring(0, 600);
            if (head.indexOf('#EXT-X-STREAM-INF') !== -1) {
                const lines = probe.split('\n');
                let variant = '';
                for (let li = 0; li < lines.length; li++) {
                    if (lines[li].indexOf('#EXT-X-STREAM-INF') === 0 && lines[li + 1]) {
                        variant = lines[li + 1].trim().replace(/["']/g, '');
                    }
                }
                if (variant) {
                    if (variant.indexOf('http') !== 0) variant = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1) + variant;
                    streams.push({ title: 'high', streamUrl: variant });
                }
                streams.push({ title: 'multi-quality (' + play.src_site + ')', streamUrl: streamUrl });
            } else {
                streams.push({ title: play.src_site || 'high', streamUrl: streamUrl });
            }
            if (typeof console !== 'undefined') console.log('[MyselfBBS] stream resolved: ' + streamUrl);
            return JSON.stringify({ streams: streams });
        }
        return JSON.stringify(empty);
    } catch (e) {
        if (typeof console !== 'undefined') console.log('[MyselfBBS] stream error: ' + e);
        return JSON.stringify({ streams: [] });
    }
}
