function __rnParseNextData(html) {
    var m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
}

function decodeHtmlEntities(str) {
    if (!str) return str;
    return str.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

async function searchResults(keyword) {
    try {
        var encodedKeyword = encodeURIComponent(keyword);
        var url = "https://readnovel.eu/search/" + encodedKeyword;
        var response = await soraFetch(url);
        var htmlText = await response.text();
        var nextData = __rnParseNextData(htmlText);
        
        var items = [];
        if (nextData && nextData.props && nextData.props.pageProps) {
            if (nextData.props.pageProps.result && nextData.props.pageProps.result.items) {
                items = nextData.props.pageProps.result.items;
            } else if (nextData.props.pageProps.items) {
                items = nextData.props.pageProps.items;
            } else if (nextData.props.pageProps.novels) {
                items = nextData.props.pageProps.novels;
            }
        }
        
        if (!Array.isArray(items)) throw new Error("search NEXT_DATA items not found");

        var results = items.map(function(item) {
            return {
                title: item.title || item.name || "Untitled",
                href: "https://readnovel.eu/novel/" + item.slug,
                image: (item.coverKey || item.cover) ? "https://cdn.wuxiaworld.eu/" + (item.coverKey || item.cover) + "-240.webp" : ""
            };
        });
        console.log("Search results found: " + results.length);
        return JSON.stringify(results);
    } catch (error) {
        console.error("Error fetching or parsing: " + error);
        return JSON.stringify([{ title: "Error", href: "", image: "" }]);
    }
}

async function extractDetails(url) {
    try {
        var response = await soraFetch(url);
        var htmlText = await response.text();
        var nextData = __rnParseNextData(htmlText);
        
        var novelData = null;
        if (nextData && nextData.props && nextData.props.pageProps) {
            novelData = nextData.props.pageProps.novel || 
                        (nextData.props.pageProps.data ? nextData.props.pageProps.data.novel : null) || 
                        nextData.props.pageProps;
        }
        
        if (!novelData) throw new Error("novel NEXT_DATA not found");

        var description = "No description available";
        if (novelData.description) {
            description = decodeHtmlEntities(novelData.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        } else if (novelData.summary) {
            description = decodeHtmlEntities(novelData.summary.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        }

        var aliases = 'N/A';
        if (Array.isArray(novelData.altTitles) && novelData.altTitles.length) {
            aliases = novelData.altTitles.join(', ');
        } else if (novelData.alternativeName) {
            aliases = novelData.alternativeName;
        }

        var airdate = novelData.createdAt ? String(novelData.createdAt).slice(0, 10) : 'N/A';

        var transformedResults = [{ description: description, aliases: aliases, airdate: airdate }];
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error: ' + error);
        return JSON.stringify([{ description: 'Error loading description', aliases: 'N/A', airdate: 'N/A' }]);
    }
}

async function extractChapters(url) {
    try {
        var response = await soraFetch(url);
        var htmlText = await response.text();
        var nextData = __rnParseNextData(htmlText);
        
        var toc = null;
        if (nextData && nextData.props && nextData.props.pageProps) {
            toc = nextData.props.pageProps.toc || 
                  nextData.props.pageProps.chapters || 
                  (nextData.props.pageProps.data ? nextData.props.pageProps.data.chapters : null);
        }
        
        if (!toc || !Array.isArray(toc.items)) {
            if (toc && Array.isArray(toc)) {
                return processChaptersArray(toc, url);
            }
            throw new Error("toc NEXT_DATA not found");
        }

        var novelSlugMatch = url.match(/\/novel\/([^\/?#]+)/);
        var novelSlug = novelSlugMatch ? novelSlugMatch[1] : null;
        if (!novelSlug) throw new Error("novel slug not found in url");

        var byNumber = {};
        for (var i = 0; i < toc.items.length; i++) {
            var it = toc.items[i];
            if (it && typeof it.number === 'number') {
                byNumber[it.number] = it;
            } else if (it && it.id) {
                byNumber[it.id] = it;
            }
        }

        var numbers = Object.keys(byNumber).map(Number).sort(function(a, b) { return a - b; });
        var chapters = numbers.map(function(n) {
            return {
                title: byNumber[n].title || byNumber[n].name || ("Chapter " + n),
                number: n,
                href: "https://readnovel.eu/chapter/" + novelSlug + "-" + n
            };
        });

        if (!chapters.length) throw new Error("no chapters found");
        console.log('Final chapters: ' + chapters.length);
        return JSON.stringify(chapters);

    } catch (error) {
        console.log('Fetch error in extractChapters: ' + error);
        return JSON.stringify([{ href: url, title: "Currently no chapters available", number: 1 }]);
    }
}

function processChaptersArray(chaptersArray, novelUrl) {
    var novelSlugMatch = novelUrl.match(/\/novel\/([^\/?#]+)/);
    var novelSlug = novelSlugMatch ? novelSlugMatch[1] : "unknown";
    var chapters = chaptersArray.map(function(chapter, index) {
        return {
            title: chapter.title || chapter.name || ("Chapter " + (index + 1)),
            number: chapter.number || chapter.id || (index + 1),
            href: chapter.url || chapter.href || ("https://readnovel.eu/chapter/" + novelSlug + "-" + (chapter.number || chapter.id || (index + 1)))
        };
    });
    return JSON.stringify(chapters);
}

async function extractText(slug) {
    try {
        var url = slug.startsWith('http') ? slug : ("https://readnovel.eu/chapter/" + slug);
        console.log("Fetching chapter URL: " + url);
        
        var response = await soraFetch(url);
        var htmlText = await response.text();

        var nextData = __rnParseNextData(htmlText);
        var paragraphs = null;
        
        if (nextData && nextData.props && nextData.props.pageProps) {
            var pageProps = nextData.props.pageProps;
            if (pageProps.data && pageProps.data.chapter && pageProps.data.chapter.paragraphs) {
                paragraphs = pageProps.data.chapter.paragraphs;
            } else if (pageProps.chapter && pageProps.chapter.paragraphs) {
                paragraphs = pageProps.chapter.paragraphs;
            } else if (pageProps.content && pageProps.content.paragraphs) {
                paragraphs = pageProps.content.paragraphs;
            }
        }

        var cleaned = "";
        if (Array.isArray(paragraphs) && paragraphs.length > 0) {
            console.log("Found " + paragraphs.length + " paragraphs in NEXT_DATA");
            cleaned = paragraphs.map(function(p) {
                var trimmed = String(p).trim();
                return trimmed ? ("<p>" + trimmed + "</p>") : "";
            }).filter(function(p) { return p !== ""; }).join('\n');
        } else {
            console.log("No paragraphs in NEXT_DATA, trying HTML fallback");
            var paragraphRegex = /<div[^>]*id="chapterText"[^>]*>([\s\S]*?)<\/div>/gi;
            var match = paragraphRegex.exec(htmlText);
            if (match && match[1]) {
                cleaned = "<p>" + match[1].trim() + "</p>";
            }
        }

        if (!cleaned || cleaned.trim().length < 50) {
            throw new Error("No paragraphs found or content too short. Length: " + (cleaned ? cleaned.length : 0));
        }
        
        console.log('Text extraction successful. Length: ' + cleaned.length);
        return cleaned;
    } catch (error) {
        console.log("Fetch error in extractText: " + error);
        return JSON.stringify({ text: 'Error extracting text: ' + error.message });
    }
                       }
