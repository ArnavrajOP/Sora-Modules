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
        return JSON.stringify(results);
    } catch (error) {
        return JSON.stringify([]);
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
            novelData.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() :
            "No description available";

        let aliases = 'N/A';
        if (Array.isArray(novelData.altTitles) && novelData.altTitles.length) aliases = novelData.altTitles.join(', ');

        const airdate = novelData.createdAt ? String(novelData.createdAt).slice(0, 10) : 'N/A';
        return JSON.stringify([{ description, aliases, airdate }]);
    } catch (error) {
        return JSON.stringify([{ description: 'Error', aliases: 'N/A', airdate: 'N/A' }]);
    }
}

async function extractChapters(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();
        
        let chapters = [];
        
        // Method 1: Try to get chapters from JSON data
        const nextData = __rnParseNextData(htmlText);
        if (nextData && nextData.props && nextData.props.pageProps) {
            const toc = nextData.props.pageProps.toc;
            if (toc && Array.isArray(toc.items)) {
                const novelSlug = (url.match(/\/novel\/([^\/?#]+)/) || [])[1];
                const byNumber = {};
                for (const it of toc.items) {
                    if (it && typeof it.number === 'number') byNumber[it.number] = it;
                }
                const numbers = Object.keys(byNumber).map(Number).sort((a, b) => a - b);
                chapters = numbers.map(n => ({
                    title: byNumber[n].title || ("Chapter " + n),
                    number: n,
                    href: `https://readnovel.eu/chapter/${novelSlug}-${n}`
                }));
            }
        }
        
        // Method 2: Fallback - Parse chapters directly from HTML links (Super Robust)
        if (chapters.length === 0) {
            const regex = /<a[^>]*href=["']\/chapter\/([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            while ((match = regex.exec(htmlText)) !== null) {
                const slug = match[1];
                let title = match[2];
                // Remove any HTML tags inside the link (like <span>, <b>, etc.)
                title = title.replace(/<[^>]+>/g, '').trim();
                
                if (title && title.length > 2) {
                    const numMatch = slug.match(/-(\d+)$/);
                    const num = numMatch ? parseInt(numMatch[1]) : 0;
                    chapters.push({
                        title: title,
                        number: num,
                        href: `https://readnovel.eu/chapter/${slug}`
                    });
                }
            }
            chapters.sort((a, b) => a.number - b.number);
            
            // Remove duplicates
            const uniqueChapters = [];
            const seen = new Set();
            for (const c of chapters) {
                if (!seen.has(c.href)) {
                    seen.add(c.href);
                    uniqueChapters.push(c);
                }
            }
            chapters = uniqueChapters;
        }

        if (chapters.length === 0) throw new Error("No chapters found");
        return JSON.stringify(chapters);
    } catch (error) {
        console.log('Fetch error in extractChapters:' + error);
        return JSON.stringify([]);
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
        }

        if (!cleaned) throw new Error("No paragraphs found");
        return cleaned;
    } catch (error) {
        return "<p>Error extracting text.</p>";
    }
}
