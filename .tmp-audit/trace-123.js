const fetchv2 = (u,h,m,b) => fetch(u,{method:m||'GET',headers:h||{},body:b}).then(async r=>({ok:r.ok,status:r.status,text:async()=>await r.text(),json:async()=>JSON.parse(await r.text())}));
(async()=>{
  const H={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126"};
  const s=JSON.parse(await (await fetchv2("https://123animehub.cc/search?keyword=one%20piece",H)).text());
  console.log("search:",s.length, (s[0]||{}).title, (s[0]||{}).href||JSON.stringify(s[0]).slice(0,80));
  // episodes
  const ep = JSON.parse(await (await fetchv2((s[0].href||s[0].id),H)).text());
  console.log("ep:", (Array.isArray(ep)?ep[0]:ep));
  const epr = Array.isArray(ep)?ep[0].href||ep[0].id : ep;
  const info = await (await fetchv2("https://123animehub.cc/ajax/episode/info?epr="+encodeURIComponent(epr),H)).json();
  console.log("info keys:", Object.keys(info), "target=", info.target);
  const tgt = await (await fetchv2(info.target,H)).text();
  console.log("target len:", tgt.length);
  console.log("has zrpart2:", /zrpart2/.test(tgt), "has megaplay:", /megaplay/i.test(tgt), "iframes:", (tgt.match(/<iframe[^>]*src="[^"]*"/gi)||[]).slice(0,4));
  // dump megaplay player area
  const i = tgt.search(/mg-player|megaplay|data-src|player/);
  console.log("snippet:", tgt.slice(Math.max(0,i-50), i+400).replace(/\s+/g,' ').slice(0,450));
})().catch(e=>console.log("ERR",e.message));
