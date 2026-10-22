function __rnParseNextData(html) {
    var m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
}

async function searchResults(keyword) {
    try {
        var url = "https://readnovel.eu/search/" + encodeURIComponent(keyword);
        var response = await soraFetch(url);
        var htmlText = await response.text();
        var nextData = __rnParseNextData(htmlText);
        var items = nextData.props.pageProps.result.items;
        var results = items.map(function(item) {
            return {
                title: item.title,
                href: "https://readnovel.eu/novel/" + item.slug,
                image: item.coverKey ? "https://cdn.wuxiaworld.eu/" + item.coverKey + "-240.webp" : ""
            };
        });
        return JSON.stringify(results);
    } catch (error) {
        return JSON.stringify([]);
    }
}

async function extractDetails(url) {
    try {
        var response = await soraFetch(url);
        var htmlText = await response.text();
        var nextData = __rnParseNextData(htmlText);
        var novelData = nextData.props.pageProps.novel;
        var description = novelData.description ? novelData.description.replace(/<[^>]+>/g, ' ').trim() : "No description";
        var aliases = novelData.altTitles ? novelData.altTitles.join(', ') : "N/A";
        var airdate = novelData.createdAt ? String(novelData.createdAt).slice(0, 10) : "N/A";
        return JSON.stringify([{ description: description, aliases: aliases, airdate: airdate }]);
    } catch (error) {
        return JSON.stringify([{ description: "Error", aliases: "N/A", airdate: "N/A" }]);
    }
}

async function extractChapters(url) {
    try {
        var response = await soraFetch(url);
        var htmlText = await response.text();
        var nextData = __rnParseNextData(htmlText);
        var toc = nextData.props.pageProps.toc;
        var novelSlug = url.match(/\/novel\/([^\/?#]+)/)[1];
        
        var byNumber = {};
        for (var i = 0; i < toc.items.length; i++) {
            var it = toc.items[i];
            if (it && typeof it.number === 'number') {
                byNumber[it.number] = it;
            }
        }
        
        var numbers = Object.keys(byNumber).map(Number).sort(function(a, b) { return a - b; });
        var chapters = numbers.map(function(n) {
            return {
                title: byNumber[n].title,
                number: n,
                href: "https://readnovel.eu/chapter/" + novelSlug + "-" + n
            };
        });
        
        return JSON.stringify(chapters);
    } catch (error) {
        return JSON.stringify([]);
    }
}

async function extractText(slug) {
    try {
        var url = slug.indexOf('http') === 0 ? slug : "https://readnovel.eu/chapter/" + slug;
        var response = await soraFetch(url);
        var htmlText = await response.text();
        var nextData = __rnParseNextData(htmlText);
        
        var paragraphs = null;
        if (nextData && nextData.props && nextData.props.pageProps && nextData.props.pageProps.data && nextData.props.pageProps.data.chapter) {
            paragraphs = nextData.props.pageProps.data.chapter.paragraphs;
        }

        if (Array.isArray(paragraphs) && paragraphs.length > 0) {
            var cleaned = paragraphs.map(function(p) {
                return "<p>" + String(p).trim() + "</p>";
            }).join('\n');
            return cleaned;
        }
        
        return "<p>No text found.</p>";
    } catch (error) {
        return "<p>Error extracting text.</p>";
    }
            }
