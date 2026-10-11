const defaultHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://123animehub.cc/"
};

async function searchResults(keyword) {
    const results = [];
    try {
        const response = await fetchv2("https://123animehub.cc/search?keyword=" + encodeURIComponent(keyword), defaultHeaders);
        const html = await response.text();

        const filmListMatch = html.match(/<div class="film-list[^"]*">([\s\S]*?)(?:<div class="clearfix"><\/div>|$(?![\s\S]))/i);
        const filmList = filmListMatch ? filmListMatch[1] : html;

        const itemBlocks = filmList.split(/<div class="item">/i).slice(1);
        for (const block of itemBlocks) {
            const hrefMatch = block.match(/href="([^"]+)"/);
            const titleMatch = block.match(/data-jtitle="([^"]+)"/) || block.match(/class="name"[^>]*>([^<]+)</) || block.match(/alt="([^"]+)"/);
            const imageMatch = block.match(/<img[^>]+data-src="([^"]+)"/) || block.match(/<img[^>]+src="([^"]+)"/) || block.match(/(?:data-src|src)="([^"]+)"/);

            if (hrefMatch && titleMatch) {
                const href = hrefMatch[1].trim();
                const title = titleMatch[1].trim();
                const image = imageMatch ? imageMatch[1].trim() : "";

                results.push({
                    title: title,
                    image: image ? (image.startsWith("http") ? image : "https://123animehub.cc" + image) : "",
                    href: href.startsWith("http") ? href : "https://123animehub.cc" + href
                });
            }
        }

        return JSON.stringify(results);
    } catch (err) {
        return JSON.stringify([{
            title: "Error",
            image: "Error",
            href: "Error"
        }]);
    }
}

async function extractDetails(url) {
    try {
        const response = await fetchv2(url, defaultHeaders);
        const html = await response.text();

        let description = "N/A";
        let aliases = "N/A";
        let airdate = "N/A";

        const descMatch = html.match(/<div class="desc">([\s\S]*?)<\/div>/);
        if (descMatch) {
            description = descMatch[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        }

        const aliasMatch = html.match(/<p class="alias">([^<]*)<\/p>/);
        if (aliasMatch) {
            aliases = aliasMatch[1].trim();
        }

        const airdateMatch = html.match(/<dt>Released:<\/dt>\s*<dd>\s*<a[^>]*>(\d+)<\/a>/);
        if (airdateMatch) {
            airdate = airdateMatch[1].trim();
        }

        return JSON.stringify([{
            description: description,
            aliases: aliases,
            airdate: airdate
        }]);
    } catch (err) {
        return JSON.stringify([{
            description: "Error",
            aliases: "Error",
            airdate: "Error"
        }]);
    }
}

async function extractEpisodes(url) {
    const results = [];
    try {
        const animeId = url.split('/').pop();

        const response = await fetchv2("https://123animehub.cc/ajax/film/sv?id=" + animeId, defaultHeaders);
        const jsonData = await response.json();
        const html = jsonData.html;

        const episodesMatch = html.match(/<ul class="episodes range"[^>]*>([\s\S]*?)<\/ul>/);
        if (!episodesMatch) {
            return JSON.stringify(results);
        }

        const episodesHTML = episodesMatch[1];

        const episodeRegex = /data-pop='(\d+)'/g;
        let match;
        const seenEpisodes = new Set();

        while ((match = episodeRegex.exec(episodesHTML)) !== null) {
            const episodeNum = parseInt(match[1], 10);

            if (!seenEpisodes.has(episodeNum)) {
                seenEpisodes.add(episodeNum);
                results.push({
                    href: animeId + "/" + episodeNum + "/vidstreaming.io",
                    number: episodeNum
                });
            }
        }

        return JSON.stringify(results);
    } catch (err) {
        return JSON.stringify([{
            href: "Error",
            number: "Error"
        }]);
    }
}

// --- AES-256-CBC pure-JS decrypt (megaplay getSources blobs) ---
// Adapted from the dessin-anime AES module; expanded to AES-256 (14 rounds).
const _A256 = (function () {
    const sbox = [], invSbox = [], rcon = [0x01];
    (function init() {
        const log = new Uint8Array(256), alog = new Uint8Array(256);
        let a = 1;
        for (let i = 0; i < 255; i++) {
            alog[i] = a; log[a] = i;
            a ^= (a << 1) ^ ((a & 0x80) ? 0x11b : 0); a &= 0xff;
        }
        const inv = (g) => g === 0 ? 0 : alog[(255 - log[g]) % 255];
        for (let i = 0; i < 256; i++) {
            let s = inv(i), xf = s;
            for (let k = 0; k < 4; k++) { xf = ((xf << 1) | (xf >> 7)) & 0xff; s ^= xf; }
            s ^= 0x63;
            sbox[i] = s; invSbox[s] = i;
        }
        for (let i = 1; i < 14; i++) {
            rcon[i] = (rcon[i - 1] << 1) ^ ((rcon[i - 1] & 0x80) ? 0x11b : 0);
            rcon[i] &= 0xff;
        }
    })();

    function expandKey(key) { // key: 32 bytes -> 60 words
        const w = new Array(60);
        for (let i = 0; i < 8; i++)
            w[i] = [key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]];
        for (let i = 8; i < 60; i++) {
            let t = w[i - 1].slice();
            if (i % 8 === 0) {
                t = [t[1], t[2], t[3], t[0]].map(b => sbox[b]);
                t[0] ^= rcon[i / 8 - 1];
            } else if (i % 8 === 4) {
                t = t.map(b => sbox[b]);
            }
            w[i] = w[i - 8].map((b, j) => b ^ t[j]);
        }
        return w;
    }

    function mul(a, b) {
        let r = 0;
        for (let i = 0; i < 8; i++) {
            if (b & 1) r ^= a;
            const hi = a & 0x80; a = (a << 1) & 0xff; if (hi) a ^= 0x1b;
            b >>= 1;
        }
        return r & 0xff;
    }

    function decryptBlock(inp, w) {
        const s = [[], [], [], []];
        for (let i = 0; i < 16; i++) s[i % 4][(i / 4) | 0] = inp[i];
        const addRound = (rnd) => {
            for (let c = 0; c < 4; c++)
                for (let r = 0; r < 4; r++)
                    s[r][c] ^= w[rnd * 4 + c][r];
        };
        const invSub = () => {
            for (let r = 0; r < 4; r++)
                for (let c = 0; c < 4; c++) s[r][c] = invSbox[s[r][c]];
        };
        const invShift = () => {
            for (let r = 1; r < 4; r++) {
                const row = s[r].slice();
                for (let c = 0; c < 4; c++) s[r][c] = row[(c - r + 4) % 4];
            }
        };
        const invMix = () => {
            for (let c = 0; c < 4; c++) {
                const a0 = s[0][c], a1 = s[1][c], a2 = s[2][c], a3 = s[3][c];
                s[0][c] = mul(a0,14)^mul(a1,11)^mul(a2,13)^mul(a3,9);
                s[1][c] = mul(a0,9)^mul(a1,14)^mul(a2,11)^mul(a3,13);
                s[2][c] = mul(a0,13)^mul(a1,9)^mul(a2,14)^mul(a3,11);
                s[3][c] = mul(a0,11)^mul(a1,13)^mul(a2,9)^mul(a3,14);
            }
        };
        addRound(14);
        for (let rnd = 13; rnd >= 1; rnd--) {
            invShift(); invSub(); addRound(rnd); invMix();
        }
        invShift(); invSub(); addRound(0);
        const out = new Array(16);
        for (let i = 0; i < 16; i++) out[i] = s[i % 4][(i / 4) | 0];
        return out;
    }

    function cbcDecrypt(cipher, key, iv) {
        const w = expandKey(key);
        const out = new Array(cipher.length);
        let prev = iv;
        for (let off = 0; off + 16 <= cipher.length; off += 16) {
            const block = cipher.slice(off, off + 16);
            const dec = decryptBlock(block, w);
            for (let i = 0; i < 16; i++) out[off + i] = dec[i] ^ prev[i];
            prev = block;
        }
        const pad = out[out.length - 1];
        return (pad > 0 && pad <= 16) ? out.slice(0, out.length - pad) : out;
    }

    return { cbcDecrypt };
})();

function _b64ToBytes(s) {
    const std = String(s).replace(/-/g, '+').replace(/_/g, '/');
    const atobFn = (typeof atob === 'function') ? atob : null;
    let bin;
    if (atobFn) bin = atobFn(std);
    else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const clean = std.replace(/=+$/, '');
        const bytes = [];
        for (let i = 0; i < clean.length; i += 4) {
            const n = [chars.indexOf(clean[i]), chars.indexOf(clean[i + 1]), chars.indexOf(clean[i + 2]), chars.indexOf(clean[i + 3])];
            bytes.push((n[0] << 2) | (n[1] >> 4));
            if (n[2] >= 0) bytes.push(((n[1] & 15) << 4) | (n[2] >> 2));
            if (n[3] >= 0) bytes.push(((n[2] & 3) << 6) | n[3]);
        }
        bin = bytes.map(b => String.fromCharCode(b)).join('');
    }
    const out = new Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
    return out;
}

// megaplay.buzz getSources blobs: AES-256-CBC, key = 16-byte ascii key
// zero-padded to 32, iv = 16-byte ascii. Verified against the live player 2026-10-11.
const _MP_KEY16 = 'i?LMTAx0Q6,:}50U';
const _MP_IV16 = "W0;27ToaUpl_P%'c";

function _mpDecryptSources(enc) {
    const cipher = _b64ToBytes(enc);
    const key = new Array(32);
    for (let i = 0; i < 32; i++) key[i] = i < _MP_KEY16.length ? (_MP_KEY16.charCodeAt(i) & 0xff) : 0;
    const iv = new Array(16);
    for (let i = 0; i < 16; i++) iv[i] = _MP_IV16.charCodeAt(i) & 0xff;
    const plain = _A256.cbcDecrypt(cipher, key, iv);
    let txt = '';
    for (let i = 0; i < plain.length; i++) txt += String.fromCharCode(plain[i]);
    return JSON.parse(txt);
}

async function extractStreamUrl(ID) {
    try {
        const response = await fetchv2("https://123animehub.cc/ajax/episode/info?epr=" + encodeURIComponent(ID), defaultHeaders);
        const data = await response.json();
        const target = data.target;

        if (!target) throw new Error("No target in response: " + JSON.stringify(data));

        const responseTarget = await fetchv2(target, defaultHeaders);
        const htmlTarget = await responseTarget.text();

        // New path (Oct 2026): the echo-video embed now iframes a megaplay
        // player whose getSources blob decrypts locally (AES-256-CBC).
        const megaMatch = htmlTarget.match(/<iframe[^>]+id="playerIframe"[^>]+src="([^"]*megaplay\.buzz[^"]*)"/i)
            || htmlTarget.match(/<iframe[^>]+src="([^"]*megaplay\.buzz[^"]*)"/i);
        if (megaMatch) {
            const megaUrl = megaMatch[1].replace(/&amp;/g, '&');
            const megaResp = await fetchv2(megaUrl, defaultHeaders);
            const megaHtml = await megaResp.text();
            const idMatch = megaHtml.match(/id="megaplay-player"[^>]*data-id="(\d+)"/) || megaHtml.match(/data-id="(\d+)"/);
            if (idMatch) {
                const srcResp = await fetchv2('https://megaplay.buzz/stream/getSources?id=' + idMatch[1] + '&platform=OTHER', defaultHeaders);
                const srcData = await srcResp.json();
                if (srcData && srcData.enc) {
                    const decrypted = _mpDecryptSources(srcData.enc);
                    const file = decrypted.file || (decrypted.sources && decrypted.sources[0] && decrypted.sources[0].file);
                    if (file) {
                        const streams = [{
                            title: "MegaPlay HLS",
                            streamUrl: file,
                            headers: {
                                "Referer": "https://megaplay.buzz/",
                                "Origin": "https://megaplay.buzz"
                            }
                        }];
                        const subs = [];
                        (srcData.tracks || []).forEach(t => {
                            if (t.file && (t.kind === 'captions' || t.kind === 'subtitles')) {
                                subs.push({ title: t.label || 'English', url: t.file, format: 'vtt' });
                            }
                        });
                        return JSON.stringify({ streams: streams, subtitles: subs.length ? subs : "" });
                    }
                }
            }
        }

        // Legacy path: zrpart2 -> mg-player -> getSources on the embed origin.
        const zrpart2Match = htmlTarget.match(/var\s+zrpart2\s*=\s*'([^']+)';/);
        if (!zrpart2Match) throw new Error("zrpart2 not found");
        const zrpart2 = zrpart2Match[1];

        const originMatch = target.match(/^(https?:\/\/[^\/]+)/);
        const origin = originMatch ? originMatch[1] : "";

        const hsUrl = `${origin}/hs/${zrpart2}`;
        const responseHs = await fetchv2(hsUrl, defaultHeaders);
        const htmlHs = await responseHs.text();
        const dataIdMatch = htmlHs.match(/id="mg-player"[^>]*data-id="([^"]+)"/);
        if (!dataIdMatch) throw new Error("data-id not found");
        const dataId = dataIdMatch[1];

        const sourcesUrl = `${origin}/hs/getSources?id=${dataId}`;
        const responseSources = await fetchv2(sourcesUrl, defaultHeaders);
        const dataSources = await responseSources.json();

        let sourcesArray = [];
        if (Array.isArray(dataSources)) {
            sourcesArray = dataSources;
        } else if (dataSources && Array.isArray(dataSources.sources)) {
            sourcesArray = dataSources.sources;
        } else if (dataSources && typeof dataSources.sources === "string") {
            sourcesArray = [{ file: dataSources.sources, label: "Auto" }];
        } else {
            console.log("Unexpected dataSources format:", JSON.stringify(dataSources));
        }

        const streams = sourcesArray.map(source => ({
            title: source.label || "Auto",
            streamUrl: "https://stream-proxy-397vf67bnod.simplepostrequest.workers.dev/?url=" + encodeURIComponent(source.file || source.url || source.link) + "&referer=https%3A%2F%2Fplay2.echovideo.ru",
            headers: {
                "Origin": "https://play2.echovideo.ru",
                "Referer": "https://play2.echovideo.ru/"
            }
        }));

        return JSON.stringify({ streams: streams });
    } catch (err) {
        console.log("Stream URL Error details:", err.message, err.stack);
        return JSON.stringify({ streams: [] });
    }
}
