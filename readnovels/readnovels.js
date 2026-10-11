// ReadNovels — readnovel.eu (Next.js SSR rebuild, Oct 2026)
// Site moved to a Next.js app: search is an SSR page (/search/<query>),
// novel + chapter data lives in <script id="__NEXT_DATA__"> JSON.
// Old wuxiaworld.eu/api endpoints are gone.

function __rnParseNextData(html) {
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
}

async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://readnovel.eu/search/${encodedKeyword}`;
        const response = await soraFetch(url);
        const htmlText = await response.text();
        const nextData = __rnParseNextData(htmlText);
        const items = nextData && nextData.props && nextData.props.pageProps &&
            nextData.props.pageProps.result && nextData.props.pageProps.result.items;
        if (!Array.isArray(items)) throw new Error("search NEXT_DATA items not found");

        const results = items.map(item => ({
            title: item.title || "Untitled",
            href: `https://readnovel.eu/novel/${item.slug}`,
            image: item.coverKey ? `https://cdn.wuxiaworld.eu/${item.coverKey}-240.webp` : ""
        }));
        console.log(JSON.stringify(results));
        return JSON.stringify(results);
    } catch (error) {
        console.error("Error fetching or parsing:" + error);
        return JSON.stringify([{
            title: "Error",
            href: "",
            image: ""
        }]);
    }
}

async function extractDetails(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();
        const nextData = __rnParseNextData(htmlText);
        const novelData = nextData && nextData.props && nextData.props.pageProps && nextData.props.pageProps.novel;
        if (!novelData) throw new Error("novel NEXT_DATA not found");

        const description = novelData.description ?
            decodeHtmlEntities(novelData.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) :
            "No description available";

        let aliases = 'N/A';
        if (Array.isArray(novelData.altTitles) && novelData.altTitles.length) aliases = novelData.altTitles.join(', ');
        else if (typeof novelData.altTitles === 'string' && novelData.altTitles.trim()) aliases = novelData.altTitles;

        const airdate = novelData.createdAt ? String(novelData.createdAt).slice(0, 10) : 'N/A';

        const transformedResults = [{ description, aliases, airdate }];
        console.log(JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:' + error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'N/A',
            airdate: 'N/A'
        }]);
    }
}

async function extractChapters(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();
        const nextData = __rnParseNextData(htmlText);
        const toc = nextData && nextData.props && nextData.props.pageProps && nextData.props.pageProps.toc;
        if (!toc || !Array.isArray(toc.items)) throw new Error("toc NEXT_DATA not found");

        const novelSlug = (url.match(/\/novel\/([^\/?#]+)/) || [])[1];
        if (!novelSlug) throw new Error("novel slug not found in url");

        const byNumber = {};
        for (const it of toc.items) {
            if (it && typeof it.number === 'number') byNumber[it.number] = it;
        }

        const pageCount = Array.isArray(toc.ranges) && toc.ranges.length ? toc.ranges.length : 1;
        if (pageCount > 1) {
            const pages = [];
            for (let p = 2; p <= pageCount; p++) pages.push(p);
            const extra = await Promise.all(pages.map(async (p) => {
                try {
                    const r = await soraFetch(`https://readnovel.eu/novel/${novelSlug}?page=${p}`);
                    const nd = __rnParseNextData(await r.text());
                    const t = nd && nd.props && nd.props.pageProps && nd.props.pageProps.toc;
                    return (t && Array.isArray(t.items)) ? t.items : [];
                } catch (e) { return []; }
            }));
            for (const list of extra) {
                for (const it of list) {
                    if (it && typeof it.number === 'number') byNumber[it.number] = it;
                }
            }
        }

        const numbers = Object.keys(byNumber).map(Number).sort((a, b) => a - b);
        const chapters = numbers.map(n => ({
            title: byNumber[n].title || ("Chapter " + n),
            number: n,
            href: `https://readnovel.eu/chapter/${novelSlug}-${n}`
        }));

        if (!chapters.length) throw new Error("no chapters found");
        console.log('Final chapters:' + chapters.length);
        return JSON.stringify(chapters);

    } catch (error) {
        console.log('Fetch error in extractChapters:' + error);
        return [{
            href: url,
            title: "Currently no chapters available",
            number: 1
        }];
    }
}

async function extractText(slug) {
    try {
        const url = slug.startsWith('http') ? slug : `https://readnovel.eu/chapter/${slug}`;
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const nextData = __rnParseNextData(htmlText);
        const paragraphs = nextData && nextData.props && nextData.props.pageProps &&
            nextData.props.pageProps.data && nextData.props.pageProps.data.chapter &&
            nextData.props.pageProps.data.chapter.paragraphs;

        let cleaned = "";
        if (Array.isArray(paragraphs) && paragraphs.length) {
            cleaned = paragraphs
                .map(p => String(p).trim())
                .filter(Boolean)
                .map(p => `<p>${p}</p>`)
                .join('\n');
        } else {
            const paragraphRegex = /<div[^>]*id="chapterText"[^>]*>([\s\S]*?)<\/div>/gi;
            let match;
            const parts = [];
            while ((match = paragraphRegex.exec(htmlText)) !== null) {
                const pText = match[1].trim();
                if (pText) parts.push(`<p>${pText}</p>`);
            }
            cleaned = parts.join('\n');
        }

        if (!cleaned) throw new Error("No paragraphs found");
        console.log('text length:' + cleaned.length);
        return cleaned;
    } catch (error) {
        console.log("Fetch error in extractText:" + error);
        return JSON.stringify({
            text: 'Error extracting text'
        });
    }
}

async function soraFetch(url, options = {
    headers: {},
    method: 'GET',
    body: null
}) {
    try {
        return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
    } catch (e) {
        try {
            return await fetch(url, options);
        } catch (error) {
            return null;
        }
    }
}

function decodeHtmlEntities(text) {
    const entities = {
        '&#x2014;': '—',
        '&#x2013;': '–',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#x2F;': '/',
        '&#x60;': '`',
        '&#x3D;': '=',
        '&nbsp;': ' '
    };

    return text.replace(/&#x[\dA-Fa-f]+;|&\w+;/g, (match) => {
        return entities[match] || match;
    });
}
