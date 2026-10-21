'use strict';
const fs = require('fs');

/* Pure-JS Unobtrusive / p.a.c.k.e.r. `while(c--)` unpacker.
 * Handles:  function(p,a,c,k,e,d){while(c--)if(k[c])p=p.replace(...);return p}('payload',A,C,'syms'.split('|')...)
 * The captured `eval(...)` IIFE is a pure string decoder, so evaluating its
 * algorithm here (without running the decoded payload) is safe. */
function unpackEval(src) {
  const m = src.indexOf('}(');
  if (m < 0) return null;
  let i = m + 2;                 // at the payload's opening quote
  i++;
  let payload = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { payload += src[i + 1]; i += 2; continue; }
    if (c === "'") break;
    payload += c; i++;
  }
  i++;                          // closing quote
  i++;                          // comma
  const radM = /^\d+/.exec(src.slice(i)); if (!radM) return null;
  const rad = radM[0]; i += rad.length;
  i++;                          // comma
  const cntM = /^\d+/.exec(src.slice(i)); if (!cntM) return null;
  const cnt = cntM[0]; i += cnt.length;
  i++; i++;                     // comma + opening quote of symtab
  let syms = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { syms += src[i + 1]; i += 2; continue; }
    if (c === "'") break;
    syms += c; i++;
  }
  const tab = syms.split('|');
  const R = parseInt(rad, 10), C = parseInt(cnt, 10);
  let out = payload;
  for (let c = C - 1; c >= 0; c--) {
    if (tab[c]) out = out.replace(new RegExp('\\b' + c.toString(R) + '\\b', 'g'), tab[c]);
  }
  return out;
}

function decodeIIFE(html) {
  const start = html.indexOf('eval(function(p,a,c,k,e,d)');
  if (start < 0) return null;
  const segEnd = html.indexOf('</script>', start);
  const seg = html.slice(start, segEnd < 0 ? html.length : segEnd);
  const iife = seg.slice(seg.indexOf('function('), seg.lastIndexOf(')'));
  return unpackEval(iife);
}

for (const name of ['updown', 'streamwish', 'vidtube', 'd0o0d']) {
  const html = fs.readFileSync('.tmp-audit/tc-' + name + '.html', 'utf8');
  let dec = null;
  try { dec = decodeIIFE(html); } catch (e) { dec = 'ERR ' + e.message; }
  if (typeof dec === 'string') {
    const f = dec.match(/file\s*:\s*["']([^"']+)["']/) || dec.match(/["'](https?:\/\/[^"'\s]+?\.(?:m3u8|mp4)[^"'\s]*?)["']/i);
    console.log(name, ':', f ? (f[1] || f[0]).slice(0, 130) : '(decoded ' + dec.length + 'B, no url)');
  } else console.log(name, ':', dec);
}
