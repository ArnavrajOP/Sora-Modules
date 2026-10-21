/* Decode the Unobtrusive/packer IIFE in each topcinema resolver and dump candidate stream URLs. */
'use strict';
const fs = require('fs');

function decodeIIFE(html) {
  const start = html.indexOf('eval(function(p,a,c,k,e,d)');
  if (start < 0) return null;
  const segEnd = html.indexOf('</script>', start);
  const seg = html.slice(start, segEnd < 0 ? html.length : segEnd);
  // seg = eval(FUNC(p,a,c,k,e,d){...}('payload',...));  → we want the FUNC(...) IIFE
  const evalOpen = seg.indexOf('(');            // the '(' of eval(
  const iife = seg.slice(evalOpen + 1, seg.lastIndexOf(')')); // FUNC(...)
  let decoded;
  try { decoded = new Function('return (' + iife + ');')(); }
  catch (e) { return null; }
  return decoded;
}

for (const name of ['updown', 'streamwish', 'vidtube', 'd0o0d']) {
  const html = fs.readFileSync('.tmp-audit/tc-' + name + '.html', 'utf8');
  const dec = decodeIIFE(html);
  if (!dec) { console.log(name, ': could not decode'); continue; }
  const fileM = dec.match(/file\s*:\s*["']([^"']+)["']/) || dec.match(/["'](https?:\/\/[^"'\s]+?\.(?:m3u8|mp4)[^"'\s]*?)["']/i) || dec.match(/hls2\/[^"'\s]+/g);
  const hls = dec.match(/https?:\/\/[^"'\s<>]+?\.m3u8[^"'\s<>]*/gi) || [];
  const mp4 = dec.match(/https?:\/\/[^"'\s<>]+?\.mp4[^"'\s<>]*/gi) || [];
  console.log('===', name, '===');
  console.log('  file:', fileM ? JSON.stringify((Array.isArray(fileM) ? fileM[0] : fileM[1] || fileM[0]).slice(0, 140)) : 'none');
  console.log('  m3u8:', (hls[0] || 'none').slice(0, 140));
  console.log('  mp4 :', (mp4[0] || 'none').slice(0, 140));
}
