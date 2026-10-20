/* .tmp-audit/verify-streams.js — probe the stream URLs returned by detail JSONs */
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');

const ids = ['hydrahd', 'animeland', 'peachify', 'flixlatam'];
for (const id of ids) {
  const j = JSON.parse(fs.readFileSync('.tmp-audit/detail-' + id + '.json', 'utf8'));
  const r = j.result || j;
  const items = ((r.stream && r.stream.items) || []);
  items.forEach((it, i) => {
    const u = it.url;
    let code = 'ERR', size = '?', ct = '';
    if (u) {
      try {
        const out = execFileSync('curl.exe', [
          '-sS', '-o', 'NUL', '-L', '--max-time', '25',
          '-w', '%{http_code} %{size_download} %{content_type}',
          u
        ], { encoding: 'utf8', timeout: 30000 }).trim();
        const parts = out.split(' ');
        code = parts[0]; size = parts[1]; ct = parts.slice(2).join(' ');
      } catch (e) { code = 'ERR ' + String(e.message || e).slice(0, 60); }
    }
    console.log(String(id).padEnd(12) + '[' + it.quality + '] ' + code.padEnd(4) + ' bytes=' + String(size).padStart(9) + ' ' + ct.padEnd(30) + '\n     ' + (u || '(no url)').slice(0, 150));
  });
}
