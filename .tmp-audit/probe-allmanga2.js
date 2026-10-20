const fs=require('fs');
const src=fs.readFileSync('allmanga/allmanga.js','utf8');
const jar=new Map();
async function soraFetch(url,headers,method,body){
  const h=Object.assign({},headers||{});
  if(jar.size&&!h['Cookie']){const p=[];for(const [n,v] of jar)p.push(n+'='+v);h['Cookie']=p.join('; ');}
  const t0=Date.now();
  const resp=await fetch(url,{method:method||'GET',headers:h,body:body});
  const text=await resp.text();
  console.log('FETCH',resp.status,String(url).slice(0,90),'|',((Date.now()-t0)/1000).toFixed(1)+'s',text.slice(0,80).replace(/\n/g,' '));
  const sc=resp.headers.get('set-cookie');
  if(sc)for(const part of String(sc).split('\n')){const kv=part.split(';')[0];const i=kv.indexOf('=');if(i>0)jar.set(kv.slice(0,i).trim(),kv.slice(i+1).trim());}
  return {ok:resp.ok,status:resp.status,url:resp.url,text:async()=>text,json:async()=>JSON.parse(text),headers:resp.headers};
}
const logs=[];
const log={log:(...a)=>{const line=a.join(' ');logs.push(line);console.log('MOD:',line.slice(0,160));},error:(...a)=>{const line='ERR '+a.join(' ');console.log(line.slice(0,160));},warn:(...a)=>{}};
const setTimeoutReal=setTimeout;
const mod=new Function('fetchv2','fetch','window','console','location','setTimeout','setInterval',src+'\n;return {searchResults,extractDetails,extractEpisodes,extractStreamUrl};')(soraFetch,soraFetch,{},log,undefined,(m)=>new Promise(r=>setTimeoutReal(r,m)),0);
(async()=>{
  let results=JSON.parse(await mod.searchResults('one piece'));
  const href=results[0].href;
  let eps=JSON.parse(await mod.extractEpisodes(href));
  const epUrl=eps[0].href||href;
  console.log('=== extractStreamUrl('+epUrl+') ===');
  const p=mod.extractStreamUrl(epUrl);
  const raced=await Promise.race([p.then(v=>'RESOLVED:'+v), new Promise(r=>setTimeoutReal(()=>r('PENDING after 60s (no exception)'),60000))]);
  console.log('RESULT:',String(raced).slice(0,400));
  process.exit(0);
})().catch(e=>{console.log('CRASH',e);process.exit(1);});
