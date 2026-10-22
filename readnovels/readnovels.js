function __rnParseNextData(html) {
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
}

async function searchResults(keyword) {
    try {
        const url = `https://readnovel.eu/search/${encodeURIComponent(keyword)}`;
        const response = await soraFetch(url);
        const htmlText = await response.text();
        const nextData = __rnParseNextData(htmlText);
        
        if (!nextData || !nextData.props || !nextData.props.pageProps) return JSON.stringify([]);
        const pageProps = nextData.props.pageProps;
        
        // SMART SEARCH: Look for ANY array in the data that contains objects with a 'slug'
        let items = [];
        for (let key in pageProps) {
            let val = pageProps[key];
            if (Array.isArray(val) && val.length > 0 && val[0].slug) {
                items = val;
                break;
            }
            if (val && val.items && Array.isArray(val.items) && val.items[0].slug) {
                items = val.items;
                break;
            }
            if (val && val.data && Array.isArray(val.data) && val.data[0].slug) {
                items = val.data;
                break;
            }
        }

        const results = items.map(item => ({
            title: item.title || item.name || "Untitled",
            href: `https://readnovel.eu/novel/${item.slug}`,
            image: item.coverKey || item.cover ? `https://cdn.wuxiaworld.eu/${item.coverKey || item.cover}-240.webp` : ""
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
        
        if (!nextData || !nextData.props || !nextData.props.pageProps) return JSON.stringify([{ description: 'Error', aliases: 'N/A', airdate: 'N/A' }]);
        const pageProps = nextData.props.pageProps;
        
        // SMART DETAILS: Look for ANY object that has a 'description' or 'summary'
        let novelData = pageProps.novel || pageProps.book || pageProps.data;
        if (!novelData) {
            for (let key in pageProps) {
                if (pageProps[key] && (pageProps[key].description || pageProps[key].summary)) {
                    novelData = pageProps[key];
                    break;
                }
            }
        }

        const description = (novelData && (novelData.description || novelData.summary)) ? 
            (novelData.description || novelData.summary).replace(/<[^>]+>/g, ' ').trim() : "No description available";
        const aliases = (novelData && novelData.altTitles) ? novelData.altTitles.join(', ') : "N/A";
        const airdate = (novelData && novelData.createdAt) ? String(novelData.createdAt).slice(0, 10) : 'N/A';
        
        return JSON.stringify([{ description, aliases, airdate }]);
    } catch (error) {
        return JSON.stringify([{ description: 'Error', aliases: 'N/A', airdate: 'N/A' }]);
    }
}

async function extractChapters(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();
        const nextData = __rnParseNextData(htmlText);
        
        let chapters = [];
        const novelSlug = (url.match(/\/novel\/([^\/?#]+)/) || [])[1];

        if (nextData && nextData.props && nextData.props.pageProps) {
            const pageProps = nextData.props.pageProps;
            // SMART CHAPTERS: Look for 'toc', 'chapters', or data.chapters
            let toc = pageProps.toc || pageProps.chapters || (pageProps.data && pageProps.data.chapters);
            
            if (toc && Array.isArray(toc.items)) {
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
        
        // Fallback: Parse HTML links directly
        if (chapters.length === 0) {
            const regex = /<a[^>]*href=["']\/chapter\/([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            while ((match = regex.exec(htmlText)) !== null) {
                const slug = match[1];
                let title = match[2].replace(/<[^>]+>/g, '').trim();
                if (title && title.length > 2) {
                    const numMatch = slug.match(/-(\d+)$/);
                    chapters.push({ title: title, number: numMatch ? parseInt(numMatch[1]) : 0, href: `https://readnovel.eu/chapter/${slug}` });
                }
            }
            chapters.sort((a, b) => a.number - b.number);
        }

        return JSON.stringify(chapters);
    } catch (error) {
        return JSON.stringify([]);
    }
}

async function extractText(slug) {
    try {
        const url = slug.startsWith('http') ? slug : `https://readnovel.eu/chapter/${slug}`;
        const response = await soraFetch(url);
        const htmlText = await response.text();
        const nextData = __rnParseNextData(htmlText);

        let paragraphs = null;
        if (nextData && nextData.props && nextData.props.pageProps) {
            const pp = nextData.props.pageProps;
            paragraphs = (pp.data && pp.data.chapter && pp.data.chapter.paragraphs) || 
                         (pp.chapter && pp.chapter.paragraphs) ||
                         (pp.content && pp.content.paragraphs);
        }

        let cleaned = "";
        if (Array.isArray(paragraphs) && paragraphs.length) {
            cleaned = paragraphs.map(p => `<p>${String(p).trim()}</p>`).join('\n');
        }
        
        if (!cleaned) {
            // Fallback HTML parsing
            const match = htmlText.match(/<div[^>]*id="chapterText"[^>]*>([\s\S]*?)<\/div>/i);
            if (match) cleaned = match[1];
        }

        return cleaned || "<p>No text found.</p>";
    } catch (error) {
        return "<p>Error extracting text.</p>";
    }
        }
