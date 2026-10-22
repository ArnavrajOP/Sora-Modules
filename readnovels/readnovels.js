// ReadNovels — readnovel.eu (Next.js SSR rebuild, Oct 2026)
// Site moved to a Next.js app: search is an SSR page (/search/<query>),
// novel + chapter data lives in <script id="__NEXT_DATA__"> JSON.
// Old wuxiaworld.eu/api endpoints are gone.

function __rnParseNextData(html) {
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
}

function decodeHtmlEntities(str) {
    if (!str) return str;
    return str.replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&#39;/g, "'")
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&nbsp;/g, ' ');
}

async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://readnovel.eu/search/${encodedKeyword}`;
        const response = await soraFetch(url);
        const htmlText = await response.text();
        const nextData = __rnParseNextData(htmlText);
        
        // Try multiple possible paths for search results
        const items = nextData && (
            (nextData.props && nextData.props.pageProps && nextData.props.pageProps.result && nextData.props.pageProps.result.items) ||
            (nextData.props && nextData.props.pageProps && nextData.props.pageProps.items) ||
            (nextData.props && nextData.props.pageProps && nextData.props.pageProps.novels) ||
            []
        );
        
        if (!Array.isArray(items)) throw new Error("search NEXT_DATA items not found");

        const results = items.map(item => ({
            title: item.title || item.name || "Untitled",
            href: `https://readnovel.eu/novel/${item.slug}`,
            image: item.coverKey || item.cover ? `https://cdn.wuxiaworld.eu/${item.coverKey || item.cover}-240.webp` : ""
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
        
        // Try multiple possible paths for novel data
        const novelData = nextData && (
            (nextData.props && nextData.props.pageProps && nextData.props.pageProps.novel) ||
            (nextData.props && nextData.props.pageProps && nextData.props.pageProps.data && nextData.props.pageProps.data.novel) ||
            (nextData.props && nextData.props.pageProps) ||
            null
        );
        
        if (!novelData) throw new Error("novel NEXT_DATA not found");

        // Extract description with multiple fallback methods
        let description = "No description available";
        if (novelData.description) {
            description = decodeHtmlEntities(novelData.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        } else if (novelData.summary) {
            description = decodeHtmlEntities(novelData.summary.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        } else if (novelData.content) {
            description = decodeHtmlEntities(novelData.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        }

        // Extract aliases
        let aliases = 'N/A';
        if (Array.isArray(novelData.altTitles) && novelData.altTitles.length) {
            aliases = novelData.altTitles.join(', ');
        } else if (Array.isArray(novelData.alternativeTitles) && novelData.alternativeTitles.length) {
            aliases = novelData.alternativeTitles.join(', ');
        } else if (typeof novelData.altTitles === 'string' && novelData.altTitles.trim()) {
            aliases = novelData.altTitles;
        } else if (novelData.alternativeName) {
            aliases = novelData.alternativeName;
        }

        const airdate = novelData.createdAt ? String(novelData.createdAt).slice(0, 10) : 
                       novelData.publishedAt ? String(novelData.publishedAt).slice(0, 10) : 'N/A';

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
        
        // Try multiple possible paths for TOC data
        const toc = nextData && (
            (nextData.props && nextData.props.pageProps && nextData.props.pageProps.toc) ||
            (nextData.props && nextData.props.pageProps && nextData.props.pageProps.chapters) ||
            (nextData.props && nextData.props.pageProps && nextData.props.pageProps.data && nextData.props.pageProps.data.chapters) ||
            null
        );
        
        if (!toc || !Array.isArray(toc.items)) {
            // Fallback: try to find chapters in different structure
            if (toc && Array.isArray(toc)) {
                // If toc itself is the array
                return processChaptersArray(toc, url);
            }
            throw new Error("toc NEXT_DATA not found");
        }

        const novelSlug = (url.match(/\/novel\/([^\/?#]+)/) || [])[1];
        if (!novelSlug) throw new Error("novel slug not found in url");

        const byNumber = {};
        for (const it of toc.items) {
            if (it && typeof it.number === 'number') byNumber[it.number] = it;
            else if (it && it.id) byNumber[it.id] = it;
        }

        const pageCount = Array.isArray(toc.ranges) && toc.ranges.length ? toc.ranges.length : 1;
        if (pageCount > 1) {
            const pages = [];
            for (let p = 2; p <= pageCount; p++) pages.push(p);
            const extra = await Promise.all(pages.map(async (p) => {
                try {
                    const r = await soraFetch(`https://readnovel.eu/novel/${novelSlug}?page=${p}`);
                    const nd = __rnParseNextData(await r.text());
                    const t = nd && (
                        (nd.props && nd.props.pageProps && nd.props.pageProps.toc) ||
                        (nd.props && nd.props.pageProps && nd.props.pageProps.chapters) ||
                        null
                    );
                    return (t && Array.isArray(t.items)) ? t.items : (Array.isArray(t) ? t : []);
                } catch (e) { return []; }
            }));
            for (const list of extra) {
                for (const it of list) {
                    if (it && typeof it.number === 'number') byNumber[it.number] = it;
                    else if (it && it.id) byNumber[it.id] = it;
                }
            }
        }

        const numbers = Object.keys(byNumber).map(Number).sort((a, b) => a - b);
        const chapters = numbers.map(n => ({
            title: byNumber[n].title || byNumber[n].name || ("Chapter " + n),
            number: n,
            href: `https://readnovel.eu/chapter/${novelSlug}-${n}`
        }));

        if (!chapters.length) throw new Error("no chapters found");
        console.log('Final chapters:' + chapters.length);
        return JSON.stringify(chapters);

    } catch (error) {
        console.log('Fetch error in extractChapters:' + error);
        return JSON.stringify([{
            href: url,
            title: "Currently no chapters available",
            number: 1
        }]);
    }
}

async function processChaptersArray(chaptersArray, novelUrl) {
    const novelSlug = (novelUrl.match(/\/novel\/([^\/?#]+)/) || [])[1];
    const chapters = chaptersArray.map((chapter, index) => ({
        title: chapter.title || chapter.name || `Chapter ${index + 1}`,
        number: chapter.number || chapter.id || index + 1,
        href: chapter.url || chapter.href || `https://readnovel.eu/chapter/${novelSlug}-${chapter.number || chapter.id || index + 1}`
    }));
    return JSON.stringify(chapters);
}

async function extractText(slug) {
    try {
        const url = slug.startsWith('http') ? slug : `https://readnovel.eu/chapter/${slug}`;
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const nextData = __rnParseNextData(htmlText);
        
        // Try multiple possible paths for chapter content
        let paragraphs = null;
        if (nextData && nextData.props && nextData.props.pageProps) {
            paragraphs = (
                nextData.props.pageProps.data?.chapter?.paragraphs ||
                nextData.props.pageProps.chapter?.paragraphs ||
                nextData.props.pageProps.content?.paragraphs ||
                nextData.props.pageProps.data?.content?.paragraphs ||
                nextData.props.pageProps.text?.paragraphs ||
                null
            );
        }

        let cleaned = "";
        if (Array.isArray(paragraphs) && paragraphs.length) {
            cleaned = paragraphs
                .map(p => String(p).trim())
                .filter(Boolean)
                .map(p => `<p>${p}</p>`)
                .join('\n');
        } else {
            // Enhanced fallback: try multiple regex patterns
            const patterns = [
                /<div[^>]*id="chapterText"[^>]*>([\s\S]*?)<\/div>/gi,
                /<div[^>]*class="[^"]*chapter[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
                /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
                /<article[^>]*>([\s\S]*?)<\/article>/gi,
                /<div[^>]*id="content"[^>]*>([\s\S]*?)<\/div>/gi
            ];
            
            for (const pattern of patterns) {
                const matches = htmlText.match(pattern);
                if (matches && matches.length > 0) {
                    // Extract and clean the content
                    const match = matches[0].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                                           .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                    cleaned = match;
                    break;
                }
            }
            
            // If still no content, try to extract all paragraph tags
            if (!cleaned) {
                const paragraphTags = htmlText.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
                if (paragraphTags.length > 10) { // Only use if we find a reasonable number of paragraphs
                    cleaned = paragraphTags.join('\n');
                }
            }
        }

        if (!cleaned || cleaned.trim().length < 100) {
            throw new Error("No paragraphs found");
        }
        
        console.log('text length:' + cleaned.length);
        return cleaned;
    } catch (error) {
        console.log("Fetch error in extractText:" + error);
        return JSON.stringify({
            text: 'Error extracting text'
        });
    }
            }
