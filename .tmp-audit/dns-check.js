/* .tmp-audit/dns-check.js — resolve domains via Google DoH + local resolver. */
'use strict';
const dns = require('dns');

const domains = process.argv.slice(2);

async function doh(name) {
  try {
    const r = await fetch('https://dns.google/resolve?name=' + encodeURIComponent(name) + '&type=A');
    const j = await r.json();
    return (j.Answer || []).map(a => a.data).join(',') || (j.Status === 3 ? 'NXDOMAIN' : 'NO-A (' + j.Status + ')');
  } catch (e) { return 'DoH ERR ' + e.message; }
}

(async () => {
  for (const d of domains) {
    let local;
    await new Promise((res) => dns.resolve4(d, (e, a) => { local = e ? ('fail:' + e.code) : a.join(','); res(); }));
    const g = await doh(d);
    console.log(d.padEnd(32) + ' local=' + local.padEnd(16) + ' gDoH=' + g);
  }
})();
