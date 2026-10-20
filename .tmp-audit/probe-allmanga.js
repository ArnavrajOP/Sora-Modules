const fs=require('fs'),path=require('path');
const src=fs.readFileSync('allmanga/allmanga.js','utf8');
// fetchv2 shim: global fetch with per-call headers; capture a cookie jar
const jar=new Map();
async function soraFetch(url,headers,method,body){
  const h=Object.assign({},headers||{});
  if(jar.size&&!h['Cookie']){const p=[];for(const [n,v] of jar)p.push(n+'='+v);h['Cookie']=p.join('; ');}
  const resp=await fetch(url,{method:method||'GET',headers:h,body:body});
  const sc=resp.headers.get('set-cookie');
  if(sc)for(const part of String(sc).split('\n')){const kv=part.split(';')[0];const i=kv.indexOf('=');if(i>0)jar.set(kv.slice(0,i).trim(),kv.slice(i+1).trim());}
  const text=await resp.text();
  return {ok:resp.ok,status:resp.status,url:resp.url,text:async()=>text,json:async()=>JSON.parse(text),headers:resp.headers};
}
const logs=[];
const log={log:(...a)=>{logs.push(a.join(' '));},error:(...a)=>{logs.push('ERR '+a.join(' '));},warn:(...a)=>{logs.push('WARN '+a.join(' '));}};
const mod=new Function('fetchv2','fetch','window','console','location','setTimeout','setInterval',src+'\n;return {searchResults,extractDetails,extractEpisodes,extractStreamUrl};')(soraFetch,soraFetch,{},{...log},undefined,(m)=>new Promise(r=>setTimeout(r,m)),0);
(async()=>{
  const kw='one piece';
  let results=JSON.parse(await mod.searchResults(kw));
  console.log('search:',results.length,'first:',results[0]&&results[0].href);
  if(!results.length){console.log('NO RESULTS');return;}
  const href=results[0].href;
  let eps=JSON.parse(await mod.extractEpisodes(href));
  console.log('episodes:',eps.length,'first:',JSON.stringify(eps[0]));
  const epUrl=eps[0].href||href;
  console.log('streaming:',epUrl);
  const t0=Date.now();
  const stream=JSON.parse(await mod.extractStreamUrl(epUrl));
  console.log('stream result in',((Date.now()-t0)/1000).toFixed(1)+'s:',JSON.stringify(stream).slice(0,300));
  console.log('\n=== module logs (last 40) ===');
  for(const l of logs.slice(-40)) console.log('  ',l.slice(0,200));
})().catch(e=>console.log('CRASH',e));
